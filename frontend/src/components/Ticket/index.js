import React, { useState, useEffect, useContext } from "react";
import { useParams, useHistory } from "react-router-dom";

import { toast } from "react-toastify";
import openSocket from "socket.io-client";
import clsx from "clsx";

import { Paper, makeStyles } from "@material-ui/core";

import ContactDrawer from "../ContactDrawer";
import MessageInput from "../MessageInput/";
import TicketHeader from "../TicketHeader";
import TicketInfo from "../TicketInfo";
import TicketActionButtons from "../TicketActionButtons";
import MessagesList from "../MessagesList";
import api from "../../services/api";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TagsContainer } from "../TagsContainer";

const drawerWidth = 320;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },

  ticketInfo: {
    maxWidth: "50%",
    flexBasis: "50%",
    [theme.breakpoints.down("sm")]: {
      maxWidth: "80%",
      flexBasis: "80%",
    },
  },
  ticketActionButtons: {
    maxWidth: "50%",
    flexBasis: "50%",
    display: "flex",
    [theme.breakpoints.down("sm")]: {
      maxWidth: "100%",
      flexBasis: "100%",
      marginBottom: "5px",
    },
  },

  mainWrapper: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeft: "0",
    marginRight: -drawerWidth,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },

  mainWrapperShift: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
  },
}));

const Ticket = () => {
  const { ticketId } = useParams();
  const history = useHistory();
  const classes = useStyles();

  const { user } = useContext(AuthContext);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState({});
  const [ticket, setTicket] = useState({});

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTicket = async () => {
        try {
          const { data } = await api.get("/tickets/u/" + ticketId);
          const { queueId } = data
          const { queues, profile } = user

          const queueAllowed = queues.find(q => q.id === queueId)
          if(queueAllowed === undefined && profile !== 'admin') {
            toast.error('Acesso não permitido');
            history.push("/tickets");
            return;
          }

          setContact(data.contact);
          setTicket(data);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchTicket();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [ticketId, user, history]);

  useEffect(() => {
    const socket = openSocket(process.env.REACT_APP_BACKEND_URL);

    socket.on("connect", () => socket.emit("joinChatBox", `${ticket.id}`));

    socket.on("ticket", (data) => {
      if (data.action === "update") {
        setTicket(data.ticket);
      }

      if (data.action === "delete") {
        toast.success("Ticket deleted sucessfully.");
        history.push("/tickets");
      }
    });

    socket.on("contact", (data) => {
      if (data.action === "update") {
        setContact((prevState) => {
          if (prevState.id === data.contact?.id) {
            return { ...prevState, ...data.contact };
          }
          return prevState;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ticketId, ticket, history]);

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const renderMessagesList = () => {
    return (
      <>
        <MessagesList
          ticket={ticket}
          ticketId={ticket.id}
          isGroup={ticket.isGroup}
        ></MessagesList>
        <MessageInput ticketId={ticket.id} ticketStatus={ticket.status} />
      </>
    )
  }

  return (
    <div className={classes.root} id="drawer-container">
      <Paper
        variant="outlined"
        elevation={0}
        className={clsx(classes.mainWrapper, {
          [classes.mainWrapperShift]: drawerOpen,
        })}
      >
        <TicketHeader loading={loading}>
          <div className={classes.ticketInfo}>
            <TicketInfo
              contact={contact}
              ticket={ticket}
              onClick={handleDrawerOpen}
            />
          </div>
          <div className={classes.ticketActionButtons}>
            <TicketActionButtons ticket={ticket} />
          </div>
        </TicketHeader>
        <Paper>
          <TagsContainer ticket={ticket} />
        </Paper>
        <ReplyMessageProvider>
          { renderMessagesList() }
        </ReplyMessageProvider>
      </Paper>
      <ContactDrawer
        open={drawerOpen}
        handleDrawerClose={handleDrawerClose}
        contact={contact}
        loading={loading}
      />
    </div>
  );
};

export default Ticket;
