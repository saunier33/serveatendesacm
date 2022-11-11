import React from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Dashboard/";
import Signup from "../pages/Signup/";
import Login from "../pages/Login/";
import Connections from "../pages/Connections/";
import Settings from "../pages/Settings/";
import Users from "../pages/Users";
import Contacts from "../pages/Contacts/";
import QuickAnswers from "../pages/QuickAnswers/";
import Schedules from "../pages/Schedules/";
import Queues from "../pages/Queues/";
import Tags from "../pages/Tags/";
import MessagesAPI from "../pages/MessagesAPI/";
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { TicketsContextProvider } from "../context/Tickets/TicketsContext";
import Route from "./Route";
import Chat from "../pages/Chat";
import TicketResponsiveContainer from "../components/TicketResponsiveContainer";

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TicketsContextProvider>
          <Switch>
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={Signup} />
            <WhatsAppsProvider>
              <LoggedInLayout>
                <Route exact path="/" component={Dashboard} isPrivate />
                <Route
                  exact
                  path="/tickets/:ticketId?"
                  component={TicketResponsiveContainer}
                  isPrivate
                />
                <Route
                  exact
                  path="/connections"
                  component={Connections}
                  isPrivate
                />
                <Route exact path="/contacts" component={Contacts} isPrivate />
                <Route exact path="/users" component={Users} isPrivate />
                <Route
                  exact
                  path="/quickAnswers"
                  component={QuickAnswers}
                  isPrivate
                />
                <Route
                  exact
                  path="/schedules"
                  component={Schedules}
                  isPrivate
                />
                <Route exact path="/tags" component={Tags} isPrivate />
                <Route
                  exact
                  path="/messages-api"
                  component={MessagesAPI}
                  isPrivate
                />
                <Route exact path="/settings" component={Settings} isPrivate />
                <Route exact path="/queues" component={Queues} isPrivate />
                <Route exact path="/chats/:id?" component={Chat} isPrivate />
              </LoggedInLayout>
            </WhatsAppsProvider>
          </Switch>
        </TicketsContextProvider>
        <ToastContainer autoClose={3000} />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
