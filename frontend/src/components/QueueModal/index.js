import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import ColorPicker from "../ColorPicker";
import {
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
} from "@material-ui/core";
import { Colorize } from "@material-ui/icons";
import { QueueOptions } from "../QueueOptions";
import SchedulesForm from "../SchedulesForm";
import { isObject } from "lodash";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  colorAdorment: {
    width: 20,
    height: 20,
  },
}));

const QueueSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  color: Yup.string().min(3, "Too Short!").max(9, "Too Long!").required(),
  greetingMessage: Yup.string(),
});

const QueueModal = ({ open, onClose, queueId }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    color: "",
    greetingMessage: "",
    outOfHoursMessage: "",
    optionType: "OPTION_LIST",
  };

  const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
  const [queue, setQueue] = useState(initialState);
  const [tab, setTab] = useState(0);
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);
  const greetingRef = useRef();
  const [attachFile, setAttachFile] = useState(null);

  const [schedules, setSchedules] = useState([
    {
      weekday: "Segunda-feira",
      weekdayEn: "monday",
      startTime: "",
      endTime: "",
    },
    {
      weekday: "Terça-feira",
      weekdayEn: "tuesday",
      startTime: "",
      endTime: "",
    },
    {
      weekday: "Quarta-feira",
      weekdayEn: "wednesday",
      startTime: "",
      endTime: "",
    },
    {
      weekday: "Quinta-feira",
      weekdayEn: "thursday",
      startTime: "",
      endTime: "",
    },
    { weekday: "Sexta-feira", weekdayEn: "friday", startTime: "", endTime: "" },
    { weekday: "Sábado", weekdayEn: "saturday", startTime: "", endTime: "" },
    { weekday: "Domingo", weekdayEn: "sunday", startTime: "", endTime: "" },
  ]);

  useEffect(() => {
    if (!open) {
      setAttachFile(null);
    }
  }, [open]);

  useEffect(() => {
    api.get(`/settings`).then(({ data }) => {
      if (Array.isArray(data)) {
        const scheduleType = data.find((d) => d.key === "scheduleType");
        if (scheduleType) {
          setSchedulesEnabled(scheduleType.value === "queue");
        }
      }
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (!queueId) return;
      try {
        const { data } = await api.get(`/queue/${queueId}`);
        setQueue((prevState) => {
          return { ...prevState, ...data };
        });
        setSchedules(data.schedules);
        if (data.fileName !== null) {
          setAttachFile({ name: data.fileName });
        }
      } catch (err) {
        toastError(err);
      }
    })();

    return () => {
      setQueue({
        name: "",
        color: "",
        greetingMessage: "",
      });
    };
  }, [queueId, open]);

  const handleClose = () => {
    onClose();
    setQueue(initialState);
  };

  const handleSaveQueue = async (values) => {
    try {
      const formData = new FormData();

      formData.append("name", values.name);
      formData.append("color", values.color);
      formData.append("greetingMessage", values.greetingMessage);
      formData.append("outOfHoursMessage", values.outOfHoursMessage);
      formData.append("optionType", values.optionType);

      if (attachFile !== null) {
        formData.append("file", attachFile);
      }

      formData.append("sechedules", schedules);

      if (queueId) {
        await api.put(`/queue/${queueId}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Dados da fila atualizada");
      } else {
        await api.post("/queue", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Nova fila criada, agora você tem acesso a mais opções");
      }
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleSaveSchedules = async (values) => {
    toast.success("Clique em salvar para registar as alterações");
    setSchedules(values);
    setTab(0);
  };

  const updateOptionType = async (val) => {
    setQueue((prev) => ({ ...prev, optionType: val }));
    await api.put(`/queue/${queueId}`, { ...queue, optionType: val });
    toast.success("Opção atualizada");
  };

  const handleAttachButton = () => {
    document.querySelector("[name=queueAttachFile]").click();
  };

  const handleFileSelected = () => {
    const fileInput = document.querySelector("[name=queueAttachFile]");
    if (fileInput.files.length > 0) {
      const first = fileInput.files[0];
      setAttachFile(first);
    }
  };

  const handleRemoveFile = () => {
    const fileInput = document.querySelector("[name=queueAttachFile]");
    fileInput.value = null;
    setAttachFile(null);
  };

  return (
    <div className={classes.root}>
      <Dialog
        maxWidth="lg"
        fullWidth={true}
        open={open}
        onClose={handleClose}
        scroll="paper"
      >
        <DialogTitle>
          {queueId
            ? `${i18n.t("queueModal.title.edit")}`
            : `${i18n.t("queueModal.title.add")}`}
        </DialogTitle>
        <Tabs
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          onChange={(_, v) => setTab(v)}
          aria-label="disabled tabs example"
        >
          <Tab label="Dados da Fila" />
          {schedulesEnabled && <Tab label="Horários de Atendimento" />}
        </Tabs>
        {tab === 0 && (
          <Paper>
            <Formik
              initialValues={queue}
              enableReinitialize={true}
              validationSchema={QueueSchema}
              onSubmit={(values, actions) => {
                setTimeout(() => {
                  handleSaveQueue(values);
                  actions.setSubmitting(false);
                }, 400);
              }}
            >
              {({ touched, errors, isSubmitting, values }) => (
                <Form>
                  <DialogContent dividers>
                    <Field
                      as={TextField}
                      label={i18n.t("queueModal.form.name")}
                      autoFocus
                      name="name"
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                      variant="outlined"
                      margin="dense"
                      className={classes.textField}
                    />
                    <Field
                      as={TextField}
                      label={i18n.t("queueModal.form.color")}
                      name="color"
                      id="color"
                      onFocus={() => {
                        setColorPickerModalOpen(true);
                        greetingRef.current.focus();
                      }}
                      error={touched.color && Boolean(errors.color)}
                      helperText={touched.color && errors.color}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <div
                              style={{ backgroundColor: values.color }}
                              className={classes.colorAdorment}
                            ></div>
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <IconButton
                            size="small"
                            color="default"
                            onClick={() => setColorPickerModalOpen(true)}
                          >
                            <Colorize />
                          </IconButton>
                        ),
                      }}
                      variant="outlined"
                      margin="dense"
                      className={classes.textField}
                    />
                    <ColorPicker
                      open={colorPickerModalOpen}
                      handleClose={() => setColorPickerModalOpen(false)}
                      onChange={(color) => {
                        values.color = color;
                        setQueue(() => {
                          return { ...values, color };
                        });
                      }}
                    />

                    {isObject(attachFile) ? (
                      <Button
                        type="button"
                        color="secondary"
                        variant="outlined"
                        className={classes.btnWrapper}
                        style={{ marginTop: 10 }}
                        onClick={handleRemoveFile}
                      >
                        {`${attachFile?.name}`} (anexo)
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        color="primary"
                        variant="outlined"
                        className={classes.btnWrapper}
                        style={{ marginTop: 10 }}
                        onClick={handleAttachButton}
                      >
                        Adicionar Arquivo
                      </Button>
                    )}
                    <div style={{ display: "none" }}>
                      <input
                        type="file"
                        name="queueAttachFile"
                        accept=".png,.jpeg,.jpg"
                        onChange={handleFileSelected}
                      />
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <Grid spacing={1} container>
                        <Grid xs={12} md={schedulesEnabled ? 6 : 12} item>
                          <Field
                            as={TextField}
                            label={i18n.t("queueModal.form.greetingMessage")}
                            type="greetingMessage"
                            multiline
                            inputRef={greetingRef}
                            rows={5}
                            fullWidth
                            name="greetingMessage"
                            error={
                              touched.greetingMessage &&
                              Boolean(errors.greetingMessage)
                            }
                            helperText="Ao incluir anexo, apenas este será enviado. O texto será ignorado."
                            variant="outlined"
                            margin="dense"
                          />
                        </Grid>
                        {schedulesEnabled && (
                          <Grid xs={12} md={6} item>
                            <Field
                              as={TextField}
                              label={i18n.t(
                                "queueModal.form.outOfHoursMessage"
                              )}
                              type="outOfHoursMessage"
                              multiline
                              rows={5}
                              fullWidth
                              name="outOfHoursMessage"
                              error={
                                touched.outOfHoursMessage &&
                                Boolean(errors.outOfHoursMessage)
                              }
                              helperText={
                                touched.outOfHoursMessage &&
                                errors.outOfHoursMessage
                              }
                              variant="outlined"
                              margin="dense"
                            />
                          </Grid>
                        )}
                      </Grid>
                    </div>
                    {queueId && queue.optionType !== undefined && (
                      <QueueOptions
                        queueId={queueId}
                        initialOptionType={queue.optionType}
                        updateOptionType={updateOptionType}
                      />
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button
                      onClick={handleClose}
                      color="secondary"
                      disabled={isSubmitting}
                      variant="outlined"
                    >
                      {i18n.t("queueModal.buttons.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      color="primary"
                      disabled={isSubmitting}
                      variant="contained"
                      className={classes.btnWrapper}
                    >
                      {queueId
                        ? `${i18n.t("queueModal.buttons.okEdit")}`
                        : `${i18n.t("queueModal.buttons.okAdd")}`}
                      {isSubmitting && (
                        <CircularProgress
                          size={24}
                          className={classes.buttonProgress}
                        />
                      )}
                    </Button>
                  </DialogActions>
                </Form>
              )}
            </Formik>
          </Paper>
        )}
        {tab === 1 && (
          <Paper style={{ padding: 20 }}>
            <SchedulesForm
              loading={false}
              onSubmit={handleSaveSchedules}
              initialValues={schedules}
              labelSaveButton="Adicionar"
            />
          </Paper>
        )}
      </Dialog>
    </div>
  );
};

export default QueueModal;
