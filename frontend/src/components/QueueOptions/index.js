import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Typography from "@material-ui/core/Typography";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  StepContent,
  TextField,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import SaveIcon from "@material-ui/icons/Save";
import EditIcon from "@material-ui/icons/Edit";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import StopIcon from "@material-ui/icons/Stop";
// import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import MicIcon from "@material-ui/icons/Mic";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { first } from "lodash";

import MicRecorder from "mic-recorder-to-mp3";
import { toast } from "react-toastify";
const Mp3Recorder = new MicRecorder({ bitRate: 128 });

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    height: 400,
    [theme.breakpoints.down("sm")]: {
      maxHeight: "20vh",
    },
  },
  button: {
    marginRight: theme.spacing(1),
  },
  input: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    width: "100%",
  },
  select: {
    width: "100%",
  },
  addButton: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  attachButton: {
    marginTop: 12,
  },
}));

export function QueueOptionStepper({ queueId, options, updateOptions }) {
  const classes = useStyles();
  const [activeOption, setActiveOption] = useState(-1);
  const [enableAttach, setEnableAttach] = useState(false);
  const [selectedFile, setSelectedFile] = useState({});
  const [recording, setRecording] = useState(false);
  const [audioRecorded, setAudioRecorded] = useState(null);

  const handleOption = (index) => async () => {
    setActiveOption(index);
    const option = options[index];

    if (option !== undefined && option.id !== undefined) {
      try {
        const { data } = await api.request({
          url: "/queue-options",
          method: "GET",
          params: { queueId, parentId: option.id },
        });
        const optionList = data.map((option) => {
          return {
            ...option,
            children: [],
            edition: false,
          };
        });
        option.children = optionList;
        updateOptions();
      } catch (e) {
        toastError(e);
      }
    }
  };

  const getFormData = (option) => {
    const formData = new FormData();
    formData.append("title", option.title);
    formData.append("message", option.message);
    formData.append("option", option.option);
    formData.append("queueId", queueId);
    formData.append("parentId", option.parentId);
    formData.append("children", option.children);
    formData.append("optionType", option.optionType);
    formData.append("fileType", option.fileType);
    formData.append("finalize", option.finalize);

    const inputFile = document.querySelector(`[name=file-${option.id}]`);

    if (inputFile && inputFile.files.length > 0) {
      formData.append("file", inputFile.files[0]);
    }

    if (audioRecorded !== null) {
      formData.append("file", audioRecorded);
    }

    return formData;
  };

  const handleSave = async (option) => {
    const formData = getFormData(option);
    try {
      if (option.id) {
        const { data } = await api.request(
          {
            url: `/queue-options/${option.id}`,
            method: "PUT",
            data: formData,
          },
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        option.id = data.id;
        option.fileName = data.fileName;
        option.path = data.path;
      } else {
        const { data } = await api.request(
          {
            url: `/queue-options`,
            method: "POST",
            data: formData,
          },
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        option.id = data.id;
        option.fileName = data.fileName;
        option.path = data.path;
      }
      // option.edition = false;
      updateOptions();
    } catch (e) {
      toastError(e);
    }
  };

  const handleEdition = (index) => {
    options[index].edition = !options[index].edition;
    updateOptions();
  };

  const handleDeleteOption = async (index) => {
    const option = options[index];
    if (option !== undefined && option.id !== undefined) {
      try {
        await api.request({
          url: `/queue-options/${option.id}`,
          method: "DELETE",
        });
      } catch (e) {
        toastError(e);
      }
    }
    options.splice(index, 1);
    options.forEach(async (option, order) => {
      option.option = order + 1;
      await handleSave(option);
    });
    updateOptions();
  };

  const handleOptionChangeTitle = (event, index) => {
    options[index].title = event.target.value;
    updateOptions();
  };

  const handleOptionChangeMessage = (event, index) => {
    options[index].message = event.target.value;
    updateOptions();
  };

  const handleOptionChangeOptionType = (event, index) => {
    options[index].optionType = event.target.value;
    updateOptions();
  };

  const handleOptionChangeFileType = (event, index) => {
    options[index].fileType = event.target.value;
    updateOptions();
  };

  const handleFinalizeChanged = (event, index) => {
    options[index].finalize = event.target.checked;
    updateOptions();
  };

  const handleToggleAttach = () => {
    setEnableAttach(!enableAttach);
  };

  const handleAddOption = (index) => {
    const optionNumber = options[index].children.length + 1;
    options[index].children.push({
      title: "",
      message: "",
      edition: false,
      option: optionNumber,
      queueId,
      parentId: options[index].id,
      children: [],
      optionType: "BUTTON_LIST",
      path: "",
      fileType: "",
      fileName: "",
      finalize: false,
    });
    updateOptions();
  };

  const handleClickAttachButton = (index) => {
    const option = options[index];
    document.querySelector(`[name=file-${option.id}]`).click();
  };

  const handleClearFile = (index) => {
    const option = options[index];
    const inputFile = document.querySelector(`[name=file-${option.id}]`);
    inputFile.value = null;
    option.path = "";
    option.fileName = "";
    setSelectedFile({});
    updateOptions();
  };

  const handleSelectedFile = (index) => {
    const option = options[index];
    const inputFile = document.querySelector(`[name=file-${option.id}]`);
    if (inputFile?.files !== undefined && inputFile?.files.length > 0) {
      setSelectedFile(first(inputFile.files));
    }
  };

  const handleStartRecording = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      Mp3Recorder.startTime = 0;
      await Mp3Recorder.start();
      setRecording(true);
      toast.info("Gravação iniciada");
    } catch (err) {
      toastError(err);
    }
  };

  const handleUploadAudio = async () => {
    try {
      const [buffer, blob] = await Mp3Recorder.stop().getMp3();
      if (blob.size < 10000) {
        setRecording(false);
        return;
      }
      const filename = `${new Date().getTime()}.mp3`;
      const file = new File(buffer, filename, {
        type: blob.type,
        lastModified: Date.now(),
      });
      setAudioRecorded(file);
      toast.success("Áudio gravado");
    } catch (err) {
      console.log(err);
      toastError(err);
    }

    setRecording(false);
  };

  const getAcceptFromOption = (type) => {
    if (type === "VIDEO") {
      return ".mpeg,.mp4";
    }
    if (type === "IMAGE") {
      return ".jpeg,.jpg,.png";
    }
    return null;
  };

  const renderTitle = (index) => {
    const option = options[index];
    if (option.edition) {
      return (
        <>
          <TextField
            multiline
            value={option.title}
            onChange={(event) => handleOptionChangeTitle(event, index)}
            size="small"
            className={classes.input}
            placeholder="Título da opção"
          />
          {option.edition && (
            <>
              <IconButton
                color="primary"
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={() => handleSave(option)}
              >
                <SaveIcon />
              </IconButton>
              {option.id && (
                <IconButton
                  color="primary"
                  variant="outlined"
                  size="small"
                  className={classes.button}
                  onClick={() => handleToggleAttach()}
                >
                  <AttachFileIcon />
                </IconButton>
              )}
              <IconButton
                variant="outlined"
                color="secondary"
                size="small"
                className={classes.button}
                onClick={() => handleDeleteOption(index)}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </>
          )}
        </>
      );
    }
    return (
      <>
        <Typography>
          {option.title !== "" ? option.title : "Título não definido"}
          <IconButton
            variant="outlined"
            size="small"
            className={classes.button}
            onClick={() => handleEdition(index)}
          >
            <EditIcon />
          </IconButton>
        </Typography>
      </>
    );
  };

  const renderMessage = (index) => {
    const option = options[index];
    if (option.edition) {
      return (
        <>
          <TextField
            style={{ width: "100%", marginTop: 18 }}
            multiline
            value={option.message}
            onChange={(event) => handleOptionChangeMessage(event, index)}
            size="small"
            className={classes.input}
            placeholder="Digite o texto da opção"
          />
        </>
      );
    }
    return (
      <>
        <Typography onClick={() => handleEdition(index)}>
          {option.message}
        </Typography>
      </>
    );
  };

  const renderOptionType = (index) => {
    const option = options[index];
    if (option.edition) {
      return (
        <FormControl className={classes.select}>
          <InputLabel id="option-type-label">Exibição de Opções</InputLabel>
          <Select
            labelId="option-type-label"
            id="option-type"
            value={option.optionType}
            onChange={(event) => handleOptionChangeOptionType(event, index)}
          >
            <MenuItem value={"BUTTON_LIST"}>
              Lista de Botões (Max. 3 no Android)
            </MenuItem>
            <MenuItem value={"OPTION_LIST"}>Lista de Opções</MenuItem>
          </Select>
        </FormControl>
      );
    } else {
      return (
        <>
          <Typography onClick={() => handleEdition(index)}>
            {option.optionType}
          </Typography>
        </>
      );
    }
  };

  const renderFileType = (index) => {
    const option = options[index];
    if (option.edition) {
      return (
        <FormControl className={classes.select}>
          <InputLabel id="option-type-label">Tipo de Arquivo</InputLabel>
          <Select
            labelId="option-type-label"
            id="option-type"
            value={option.fileType}
            onChange={(event) => handleOptionChangeFileType(event, index)}
            disabled={option.path !== null && option.path !== ""}
          >
            <MenuItem value={"IMAGE"}>Imagem</MenuItem>
            <MenuItem value={"VIDEO"}>Vídeo</MenuItem>
            <MenuItem value={"AUDIO"}>Áudio</MenuItem>
            <MenuItem value={"DOCUMENT"}>Documento</MenuItem>
          </Select>
        </FormControl>
      );
    } else {
      return (
        <>
          <Typography onClick={() => handleEdition(index)}>
            {option.fileType}
          </Typography>
        </>
      );
    }
  };

  const renderAudioOptions = (option, index) => {
    if (option.path === "") {
      return (
        <Grid xs={4} item>
          {!recording && (
            <IconButton
              color="primary"
              variant="outlined"
              size="small"
              className={classes.attachButton}
              onClick={handleStartRecording}
            >
              <MicIcon />
            </IconButton>
          )}
          {recording && (
            <IconButton
              color="secondary"
              variant="outlined"
              size="small"
              className={classes.attachButton}
              onClick={handleUploadAudio}
            >
              <StopIcon />
            </IconButton>
          )}
          {/* <IconButton
            color="secondary"
            variant="outlined"
            size="small"
            className={classes.attachButton}
            onClick={() => handleCancelAudio(option, index)}
          >
            <HighlightOffIcon />
          </IconButton> */}
        </Grid>
      );
    } else {
      return (
        <Grid xs={4} item>
          <Button
            color="secondary"
            variant="outlined"
            onClick={() => handleClearFile(index)}
            className={classes.attachButton}
          >
            Alterar {option?.fileName}
          </Button>
        </Grid>
      );
    }
  };

  const renderAttachOptions = (option, index) => {
    return (
      <Grid xs={4} item>
        {option?.fileName !== "" && option?.fileName !== null && (
          <Button
            color="secondary"
            variant="outlined"
            onClick={() => handleClearFile(index)}
            className={classes.attachButton}
          >
            Alterar {option?.fileName}
          </Button>
        )}
        {option?.path === "" && (
          <Button
            color="primary"
            variant="outlined"
            onClick={() => handleClickAttachButton(index)}
            className={classes.attachButton}
          >
            Anexo {selectedFile?.name}
          </Button>
        )}
      </Grid>
    );
  };

  const renderFinalizeOption = (option, index) => {
    return (
      <Grid xs={3} item>
        <FormControlLabel
          style={{ paddingTop: 15 }}
          control={
            <Checkbox
              checked={option.finalize}
              onChange={(event) => handleFinalizeChanged(event, index)}
              color="primary"
            />
          }
          label="Finalizar Atendimento"
        />
      </Grid>
    );
  };

  // const handleCancelAudio = async (option, index) => {
  //   try {
  //     if (recording) {
  //       await Mp3Recorder.stop().getMp3();
  //       setRecording(false);
  //     }
  //     if (option.path) {
  //       option.path = "";
  //       option.fileName = "";
  //       updateOptions();
  //     }
  //     handleClearFile(index);
  //   } catch (err) {
  //     console.log(err);
  //     toastError(err);
  //   }
  // };

  const renderStep = (option, index) => {
    return (
      <Step key={index}>
        <StepLabel style={{ cursor: "pointer" }} onClick={handleOption(index)}>
          {renderTitle(index)}
        </StepLabel>
        <StepContent>
          {option.id && (
            <div style={{ display: "none" }}>
              <input
                type="file"
                accept={getAcceptFromOption(option.fileType)}
                name={`file-${option.id}`}
                onChange={() => handleSelectedFile(index)}
              />
            </div>
          )}
          <Grid spacing={2} container>
            {option.edition &&
              option.children.length > 0 &&
              option.id !== undefined && (
                <Grid xs={3} item>
                  {renderOptionType(index)}
                </Grid>
              )}
            {option.edition && enableAttach && (
              <Grid xs={3} item>
                {renderFileType(index)}
              </Grid>
            )}
            {option.edition &&
              enableAttach &&
              option.fileType !== "" &&
              option.fileType === "AUDIO" &&
              renderAudioOptions(option, index)}
            {option.edition &&
              enableAttach &&
              option.fileType !== "" &&
              option.fileType !== "AUDIO" &&
              renderAttachOptions(option, index)}
            {option.edition &&
              option.children.length === 0 &&
              renderFinalizeOption(option, index)}
            {option.children.length > 0 && (
              <Grid xs={12} item>
                {renderMessage(index)}
              </Grid>
            )}
            <Grid xs={12} item>
              {option.id !== undefined && (
                <>
                  <Button
                    color="primary"
                    size="small"
                    onClick={() => handleAddOption(index)}
                    startIcon={<AddIcon />}
                    variant="outlined"
                    className={classes.addButton}
                  >
                    Adicionar
                  </Button>
                </>
              )}
            </Grid>
          </Grid>
          <QueueOptionStepper
            queueId={queueId}
            options={option.children}
            updateOptions={updateOptions}
          />
        </StepContent>
      </Step>
    );
  };

  const renderStepper = () => {
    return (
      <Stepper
        style={{ marginBottom: 0, paddingBottom: 0 }}
        nonLinear
        activeStep={activeOption}
        orientation="vertical"
      >
        {options.map((option, index) => renderStep(option, index))}
      </Stepper>
    );
  };

  return renderStepper();
}

export function QueueOptions({ queueId, initialOptionType, updateOptionType }) {
  const classes = useStyles();
  const [options, setOptions] = useState([]);
  const [optionType, setOptionType] = useState(`${initialOptionType}`);

  useEffect(() => {
    if (queueId) {
      const fetchOptions = async () => {
        try {
          const { data } = await api.request({
            url: "/queue-options",
            method: "GET",
            params: { queueId, parentId: -1 },
          });
          const optionList = data.map((option) => {
            return {
              ...option,
              children: [],
              edition: false,
            };
          });
          setOptions(optionList);
        } catch (e) {
          toastError(e);
        }
      };
      fetchOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderStepper = () => {
    if (options.length > 0) {
      return (
        <QueueOptionStepper
          queueId={queueId}
          updateOptions={updateOptions}
          options={options}
        />
      );
    }
  };

  const updateOptions = () => {
    setOptions([...options]);
  };

  const addOption = () => {
    const newOption = {
      title: "",
      message: "",
      edition: false,
      option: options.length + 1,
      queueId,
      parentId: null,
      children: [],
      optionType: "BUTTON_LIST",
      path: "",
      fileType: "",
      fileName: "",
      finalize: false,
    };
    setOptions([...options, newOption]);
  };

  const handleOptionTypeChanged = (val) => {
    setOptionType(val);
    updateOptionType(val);
  };

  return (
    <div className={classes.root}>
      <br />
      <Grid spacing={2} container>
        <Grid xs={12} sm={2} item>
          <Typography style={{ marginTop: 15 }}>
            Opções
            <Button
              color="primary"
              size="small"
              onClick={addOption}
              startIcon={<AddIcon />}
              style={{ marginLeft: 10 }}
              variant="outlined"
            >
              Adicionar
            </Button>
          </Typography>
        </Grid>
        <Grid xs={12} sm={3} item>
          <FormControl className={classes.select}>
            <InputLabel id="option-type-label">Exibição de Opções</InputLabel>
            <Select
              labelId="option-type-label"
              id="option-type"
              value={optionType}
              onChange={(event) => handleOptionTypeChanged(event.target.value)}
            >
              <MenuItem value={"BUTTON_LIST"}>
                Lista de Botões (Max. 3 no Android)
              </MenuItem>
              <MenuItem value={"OPTION_LIST"}>Lista de Opções</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      {renderStepper()}
    </div>
  );
}
