import React, { useEffect, useState } from "react";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import {
  makeStyles,
  Paper,
  Tabs,
  Tab,
  Typography,
  Select,
  Grid,
} from "@material-ui/core";
import toastError from "../../errors/toastError";
import openSocket from "socket.io-client";

import TabPanel from "../../components/TabPanel";

import SchedulesForm from "../../components/SchedulesForm";

import { i18n } from "../../translate/i18n.js";
import { toast } from "react-toastify";

import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.palette.background.paper,
    paddingTop: 10,
  },
  mainPaper: {
    ...theme.scrollbarStyles,
    overflowY: "scroll",
    flex: 1,
  },
  tab: {
    background: "#f2f5f3",
    borderRadius: 4,
  },
  paper: {
    ...theme.scrollbarStyles,
    overflowY: "scroll",
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  container: {
    width: "100%",
    maxHeight: "100%",
  },
  control: {
    padding: theme.spacing(1),
  },
  textfield: {
    width: "100%",
  },
}));

const Settings = () => {
  const classes = useStyles();
  const [tab, setTab] = useState("schedules");
  const [schedules, setSchedules] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get("/settings");
        setSettings(data);

        const currentSchedules = data.find((s) => s.key === "schedules");
        if (currentSchedules) {
          setSchedules(JSON.parse(currentSchedules.value));
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const socket = openSocket(process.env.REACT_APP_BACKEND_URL);

    socket.on("settings", (data) => {
      if (data.action === "update") {
        setSettings((prevState) => {
          const aux = [...prevState];
          const settingIndex = aux.findIndex((s) => s.key === data.setting.key);
          aux[settingIndex].value = data.setting.value;
          return aux;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleChangeSetting = async (e) => {
    const selectedValue = e.target.value;
    const settingKey = e.target.name;

    try {
      await api.put(`/settings/${settingKey}`, {
        value: selectedValue,
      });
      toast.success(i18n.t("settings.success"));
    } catch (err) {
      toastError(err);
    }
  };

  const getSettingValue = (key) => {
    if (settings && settings.length > 0) {
      const { value } = settings.find((s) => s.key === key);
      return value;
    }
    return "";
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleSubmitSchedules = async (data) => {
    setLoading(true);
    try {
      setSchedules(data);
      await api.put(`settings/schedules`, { value: data });
      toast.success("Horários atualizados com sucesso.");
    } catch (e) {
      toast.error(e);
    }
    setLoading(false);
  };

  return (
    <MainContainer>
      <MainHeader></MainHeader>
      <Title>&nbsp;{i18n.t("settings.title")}</Title>
      <Paper className={classes.mainPaper} elevation={1}>
        <Tabs
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          onChange={handleTabChange}
          className={classes.tab}
        >
          <Tab label="Horários" value={"schedules"} />
          <Tab label="Opções" value={"options"} />
        </Tabs>
        <Paper className={classes.paper} elevation={0}>
          <TabPanel
            className={classes.container}
            value={tab}
            name={"schedules"}
          >
            <SchedulesForm
              loading={loading}
              onSubmit={handleSubmitSchedules}
              initialValues={schedules}
            />
          </TabPanel>
          <TabPanel className={classes.container} value={tab} name={"options"}>
            <Grid container>
              <Grid xs={12} md={3} item>
                <Typography variant="body1">
                  {i18n.t("settings.settings.userCreation.name")}
                </Typography>
                <Select
                  margin="dense"
                  variant="outlined"
                  native
                  id="userCreation-setting"
                  name="userCreation"
                  value={getSettingValue("userCreation")}
                  onChange={handleChangeSetting}
                  className={classes.textfield}
                >
                  <option value="enabled">
                    {i18n.t("settings.settings.userCreation.options.enabled")}
                  </option>
                  <option value="disabled">
                    {i18n.t("settings.settings.userCreation.options.disabled")}
                  </option>
                </Select>
              </Grid>
            </Grid>
          </TabPanel>
        </Paper>
      </Paper>
    </MainContainer>
  );
};

export default Settings;
