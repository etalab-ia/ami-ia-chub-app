import React from "react";
import { bindActionCreators } from "redux";
import * as DashboardActions from "../../store/actions/dashboardActions.js";
import { clearSuggestions } from "../../store/actions/searchActions.js";
import {
  userLogout,
  userSessionExpired,
} from "../../store/actions/sessionActions.js";
import _ from "lodash";
import { Input, Button, DatePicker } from "antd";
import moment from "moment";
import {
  CheckOutlined,
  LogoutOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { SejoursTimeline } from "./components/Timelines/sejour-timeline.jsx";
import { PmsiTimeline } from "./components/Timelines/pmsi-timeline.jsx";
import { QrTimeline } from "./components/Timelines/qr-timeline.jsx";
import { MedicationTimeline } from "./components/Timelines/medication-timeline.jsx";
import { DocumentsTimeline } from "./components/Timelines/documents-timeline.jsx";
import { LrTimeline } from "./components/Timelines/lr-timeline.jsx";
import { TimelineConfigModal } from "./components/Modals/timeline-config-modal.jsx";
import { DocumentTabs } from "./components/tabs.jsx";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Notif } from "../../atomic/notification.jsx";
import "antd/dist/antd.css";
import network from "../../network";
import "../../styles/index.css";
import popinWrapper from "../../utils/popinWrapper";
import tooltipWrapper from "../../utils/tooltipWrapper";
import SearchPane from "./components/search-pane.jsx";

import { search } from "../../network/search";
import { SearchQueryCombination, SearchQueryMatching } from "../../store/defs";

class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      series: null,
      testPatient: props.patient,
      inputNip: "",
      dataPatient: null,
      startDate: null,
      endDate: null,
      newStartDate: null,
      newEndDate: null,
      hospitalisationTimeline: null,
      consultationTimeline: null,
      pmsiTimeline: null,
      qrMedicalTimeline: null,
      qrParamedicalTimeline: null,
      medicationTimeline: null,
      clinicalReportTimeline: null,
      lrTimeline: null,
      timelinesDisplayConfig: undefined,
      timelinesDisplayConfigVisible: false,
      currentlyRequestingData: false,
      openDocuments: [],
      subtree: {},
    };
    this.handleNip = this.handleNip.bind(this);
    this.handleDataRefresh = this.handleDataRefresh.bind(this);
    this.changeDate = this.changeDate.bind(this);
    this.handleTimeLineWheelEvent = this.handleTimeLineWheelEvent.bind(this);
    this.handleTimelineZoom = this.handleTimelineZoom.bind(this);
    this.handleTimelineDragEvent = this.handleTimelineDragEvent.bind(this);
    this.handleTimelineDrag = this.handleTimelineDrag.bind(this);
    this.createTimelinesDisplayConfig = this.createTimelinesDisplayConfig.bind(
      this
    );
    this.handleTimelinesDisplayConfigUpdate = this.handleTimelinesDisplayConfigUpdate.bind(
      this
    );
    this.handleTimelinesDisplayConfigOpen = this.handleTimelinesDisplayConfigOpen.bind(
      this
    );
    this.handleTimelinesConfigClose = this.handleTimelinesConfigClose.bind(
      this
    );
    this.getTimelineVisible = this.getTimelineVisible.bind(this);
    this.getSubTimelinesVisible = this.getSubTimelinesVisible.bind(this);
    this.addDocumentTab = this.addDocumentTab.bind(this);
    this.removeDocumentTab = this.removeDocumentTab.bind(this);
  }

  static propTypes = {
    testPatient: PropTypes.object,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = ["patient"];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      return mutableProps;
    }
    return null;
  }

  componentDidUpdate(prevProps) {
    if (this.props.searchResults !== prevProps.searchResults)
      this.createTimelinesDisplayConfig(
        this.props.searchResults
          ? [
              this.props.searchResults.pmsis,
              this.props.searchResults.clinicalReports,
              this.props.searchResults.qrMedical,
              this.props.searchResults.qrParamedical,
              this.props.searchResults.labResults,
              this.props.searchResults.medicationAdministrations,
            ]
          : [
              this.state.pmsiTimeline,
              this.state.clinicalReportTimeline,
              this.state.qrMedicalTimeline,
              this.state.qrParamedicalTimeline,
              this.state.lrTimeline,
              this.state.medicationTimeline,
            ]
      );
  }

  /**
   * bouton de recherche du dossier patient
   *
   * @param {string} e id du dossier à ouvrir
   */
  handleNip(e) {
    this.setState({
      input: e.target.value,
    });
  }

  /*****************************************
   * Fonctions de gestion des dates / zoom / déplacements de la timeline
   *****************************************/

  /**
   * Fonction de changement de date
   *
   * @param {boolean} start si true, on change la start date, sinon la end date
   * @param {moment.Moment} newDateMoment nouvelle date
   */
  changeDate = (start, newDateMoment) => {
    if (start) {
      if (newDateMoment) {
        this.setState({ newStartDate: newDateMoment.format() });
      } else {
        this.setState({
          newStartDate: null,
        });
      }
    } else {
      if (newDateMoment) {
        this.setState({ newEndDate: newDateMoment.format() });
      } else {
        this.setState({
          newEndDate: null,
        });
      }
    }
  };

  /**
   * Appel du backend pour les données correspondant aux nouvelles dates
   * @param {TimeRange}} tr
   */
  changeTimeRange = (tr) => {
    console.log(tr);
    if (this.state.currentlyRequestingData) return;

    this.setState({
      newStartDate: moment(tr.begin()).format(),
      newEndDate: moment(tr.end()).format(),
    });

    this.setState({ currentlyRequestingData: true }, () =>
      this.handleDataRefresh()
    );
  };

  /**
   * Gestion de la molette sur la timeline
   * @param {Event} e
   */
  handleTimeLineWheelEvent(e) {
    if (!("target" in e) || !e.target.outerHTML.includes("eventchart")) return;
    this.handleTimelineZoom(e.deltaY < 0);
  }

  /**
   * Gestion du zoom : on change les dates et on récupère les nouvelles données
   * @param {boolean} zoomIn si true, on zoome, sinon on dézoome
   */
  handleTimelineZoom = (zoomIn) => {
    let { startDate, endDate, currentlyRequestingData } = this.state;
    if (currentlyRequestingData) return;

    const changePercentage = 0.5;
    startDate = moment(startDate);
    endDate = moment(endDate);
    if (zoomIn) {
      //   console.log("zooming");
      const currentTimegap =
        endDate.toDate().getTime() - startDate.toDate().getTime();
      let midDate = new Date(
        (startDate.toDate().getTime() + endDate.toDate().getTime()) / 2
      );
      this.changeDate(
        true,
        moment(
          new Date(
            midDate.getTime() - ((1 - changePercentage) * currentTimegap) / 2
          )
        )
      );
      this.changeDate(
        false,
        moment(
          new Date(
            midDate.getTime() + ((1 - changePercentage) * currentTimegap) / 2
          )
        )
      );
    } else {
      //   console.log("Dezooming");
      const currentTimegap =
        endDate.toDate().getTime() - startDate.toDate().getTime();
      let midDate = new Date(
        (startDate.toDate().getTime() + endDate.toDate().getTime()) / 2
      );
      this.changeDate(
        true,
        moment(
          new Date(
            midDate.getTime() - ((1 + changePercentage) * currentTimegap) / 2
          )
        )
      );
      this.changeDate(
        false,
        moment(
          new Date(
            midDate.getTime() + ((1 + changePercentage) * currentTimegap) / 2
          )
        )
      );
    }

    this.setState({ currentlyRequestingData: true }, () =>
      this.handleDataRefresh()
    );
  };

  /**
   * Détection du drag sur la timeline : on attend un event de début et on créée un listener pour l'evenement de fin,
   * puis on appelle la fonction de gestion du drag
   * @param {event} eventStart  event de début de drag
   */
  handleTimelineDragEvent = (eventStart) => {
    if (
      !("target" in eventStart) ||
      !eventStart.target.outerHTML.includes("eventchart")
    )
      return;
    // console.log(eventStart.type);
    const startX = eventStart.pageX;
    document.addEventListener(
      "mouseup",
      (eventEnd) => {
        // console.log("mouse up");
        const endX = eventEnd.pageX;
        const move = startX - endX;
        const totalWidth = (window.innerWidth * 21) / 24;
        if (Math.abs(move / totalWidth) > 0.05)
          this.handleTimelineDrag(move / totalWidth);
      },
      { once: true }
    );
  };

  /**
   * Gestion du drag de la timeline. On calcule les nouvelles dates et on appelle le service backend
   * @param {number} movePercentage -1 < float < 1. si < 0, on drag la timeline de droite à gauche (donc on affiche un segment "plus actuel").
   */
  handleTimelineDrag = (movePercentage) => {
    // console.log(movePercentage)
    let { startDate, endDate, currentlyRequestingData } = this.state;
    if (currentlyRequestingData) return;

    startDate = moment(startDate);
    endDate = moment(endDate);
    const currentTimegap =
      endDate.toDate().getTime() - startDate.toDate().getTime();
    this.changeDate(
      true,
      moment(
        new Date(startDate.toDate().getTime() + movePercentage * currentTimegap)
      )
    );
    this.changeDate(
      false,
      moment(
        new Date(endDate.toDate().getTime() + movePercentage * currentTimegap)
      )
    );
    this.setState({ currentlyRequestingData: true }, () =>
      this.handleDataRefresh()
    );
  };

  /**************************************************
   * Appel service backend + Gestion des données de la timeline et de leur affichage
   **************************************************/

  /**
   * Appel du service et stockage des données. Création/update de la config d'affichage
   */
  handleDataRefresh = async () => {
    let { input, startDate, newStartDate, endDate, newEndDate, openDocuments } = this.state;

    if (!isNaN(input)) {
      let endpoint = `fhir/timeline/${input}`;
      if (newStartDate || newEndDate) {
        endpoint += `?start_date=${moment(newStartDate? newStartDate : startDate).format(
          "DD-MM-YYYY"
        )}&end_date=${moment(newEndDate? newEndDate: endDate).format("DD-MM-YYYY")}`;
      } else {
        openDocuments = [];
      }
      network(this.props.authToken)
        .get(endpoint, null, null)
        .then((t) => {
          this.setState(
            {
              dataPatient: t?.infoPatient,
              hospitalisationTimeline: t?.hospitalisations,
              consultationTimeline: t?.consultations,
              pmsiTimeline: t?.pmsis,
              qrMedicalTimeline: t?.qrMedical,
              qrParamedicalTimeline: t?.qrParamedical,
              medicationTimeline: t?.medicationAdministrations,
              clinicalReportTimeline: t?.clinicalReports,
              lrTimeline: t?.labResults,
              startDate: t?.oldest,
              endDate: t?.recent,
              newStartDate: null,
              newEndDate: null,
              openDocuments: openDocuments,
              currentlyRequestingData: false,
            },
            () => {
              this.createTimelinesDisplayConfig([
                t?.pmsis,
                t?.clinicalReports,
                t?.qrMedical,
                t?.qrParamedical,
                t?.labResults,
                t?.medicationAdministrations,
              ]);
            }
          );
          Notif(
            "success",
            "Chargement terminé",
            "Les données patient sont dorénavant accessibles."
          );
        })
        .catch((t) => {
						if (t.name === 'HttpError') {
							if (t.code === 401)
								return this.props.userSessionExpired();
							else if (t.code === 404)
								Notif('error', `Erreur NIP`, 'Le Numéro d\'Identification du Patient est introuvable.');
							else
								Notif('error', `Erreur ${t.code}`,
									`Le chargement des données du patient a échoué. Le serveur a répondu: ${(t.response && t.response.data && (t.response.data.message || t.response.data.error)) || `${t.code} ${t.message}.`}`);
						} else {
							console.error(t);
							Notif('error', 'Service indisponible',
								`Une erreur inattendue s'est produite lors du chargement des données du patient. Vérifiez votre connexion et réessayez.`);
						}
        });
    } else {
      Notif("warning", "Erreur NIP", "Veuillez entrer un numéro valide.");
    }
  };

  /**
   * Création ou update de la config d'affichage
   * @param {Array} timelineDataArray array contenant les différentes timelines
   */
  createTimelinesDisplayConfig = (timelineDataArray) => {
    let { timelinesDisplayConfig } = this.state;
    if (timelinesDisplayConfig === undefined) {
      // création de la config
      timelinesDisplayConfig = timelineDataArray.map((dataObject) => {
        let node = {};
        if (dataObject.hasOwnProperty("mainTimeline")) {
          node = {
            title: dataObject?.mainTimeline?.name,
            key: dataObject?.mainTimeline?.name,
            checked: true,
            has_values: true,
          };
        }
        if ("subTimelines" in dataObject) {
          node.children = [];
          dataObject.subTimelines.forEach((sub) => {
            node.children.push({
              title: sub.name,
              key: `${dataObject.mainTimeline.name}:${sub.name}`,
              checked: true,
              has_values: true,
            });
          });
        }
        return node;
      });
    } else {
      // update de la config
      timelinesDisplayConfig = timelinesDisplayConfig.map((node) => {
        node.has_values = false;
        if ("children" in node) {
          node.children = node.children.map((child) => {
            child.has_values = false;
            return child;
          });
        }
        return node;
      });
      //console.log(timelinesDisplayConfig)
      timelineDataArray.forEach((dataObject) => {
        if (dataObject.hasOwnProperty("mainTimeline")) {
          const key = dataObject?.mainTimeline?.name;
          let node = _.filter(timelinesDisplayConfig, { key: key });
          if (node.length) {
            node = node[0];
            node.has_values = true;

            if ("subTimelines" in dataObject) {
              const newChildren = dataObject.subTimelines.map((sub) => {
                return {
                  title: sub.name,
                  key: `${dataObject.mainTimeline.name}:${sub.name}`,
                  checked: true,
                  has_values: true,
                };
              });
              for (const i of Array(
                Math.min(node.children.length, newChildren.length)
              ).keys()) {
                newChildren[i].checked = node.children[i].checked;
              }
              node.children = newChildren;
            }
          }
        }
      });
    }

    this.setState({
      timelinesDisplayConfig: timelinesDisplayConfig,
    });
  };

  /**
   * Fonction pour savoir si une timeline ou une sous-timeline est visible selon la config d'affichage
   * @param {string} configKey clé de la timeline à chercher
   * @param {string, optionnal} subkey clé de la sous-timeline à chercher
   * @returns boolean
   */
  getTimelineVisible = (configKey, subkey) => {
    let { timelinesDisplayConfig } = this.state;
    if (!timelinesDisplayConfig) return false;

    if (subkey === undefined) {
      // main key
      let visible = null;
      timelinesDisplayConfig.forEach((tl) => {
        if (tl.key === configKey) {
          visible = tl.checked && tl.has_values;
        }
      });
      return visible;
    } else {
      // subkey
      return timelinesDisplayConfig.some(
        (tl) =>
          tl.key === configKey &&
          "children" in tl &&
          tl.children.some((tl_c) => tl_c.title === subkey && tl_c.checked)
      );
    }
  };

  /**
   * Fonction permettant de savoir si une timeline a des sous-timelines
   * @param {string} configKey clé de la timeline à chercher
   * @returns boolean
   */
  timelineHasChildren = (configKey) => {
    let { timelinesDisplayConfig } = this.state;
    if (!timelinesDisplayConfig) return false;

    return timelinesDisplayConfig.some(
      (tl) => tl.key === configKey && tl.children && tl.children.length > 0
    );
  };

  /**
   * Récupération des sous-timelines visibles d'une timeline
   * @param {string} configKey clé de la timeline à chercher
   * @returns string[] clés des sous-timelines visibles
   */
  getSubTimelinesVisible = (configKey) => {
    let { timelinesDisplayConfig } = this.state;
    if (!timelinesDisplayConfig || !this.isSubtreeOpen(configKey)) return [];
    let visible = [];
    timelinesDisplayConfig.forEach((tl) => {
      if (tl.key === configKey) {
        if ("children" in tl) {
          tl.children.forEach((tl_c) => {
            if (tl_c.checked && tl_c.has_values) {
              visible.push(tl_c.title);
            }
          });
        }
      }
    });
    return visible;
  };

  /**
   * Update de la config d'affichage
   * @param {Array} newTimelinesDisplayConfig la nouvelle config
   */
  handleTimelinesDisplayConfigUpdate = (newTimelinesDisplayConfig) => {
    this.setState({
      timelinesDisplayConfig: newTimelinesDisplayConfig,
    });
  };

  /**
   * ouverture de l'affichage de la config
   * @param {event} e
   */
  handleTimelinesDisplayConfigOpen = (e) => {
    this.setState({
      timelinesDisplayConfigVisible: true,
    });
  };

  /**
   * fermeture de l'affichage de la config
   * @param {event} e
   */
  handleTimelinesConfigClose = (e) => {
    this.setState({
      timelinesDisplayConfigVisible: false,
    });
  };


  /****************************************
   * Fonction d'affichage des différentes timelines
   ****************************************/

  /**
   * Pour savoir si une sous-timeline existe dans les données (car les sous-timelines pouvant changer en fonction des recherches, la config peut contenir
   * des noms de sous-timelines qui ne sont plus pertinent à un moment donné)
   * @param {timeline} tl la timeline
   * @returns boolean
   */
  subTimelineExists = (tl) => {
    const stls = tl.subTimelines
      ? tl.subTimelines.filter((a) => a).map((a) => a.name)
      : [];

    return (a) => stls.includes(a);
  };

  /**
   * Ouverture de l'affichage des sous-timelines
   * @param {string} k clé de la timeline
   */
  toggleSubtree = (k) =>
    this.setState({
      subtree: { ...this.state.subtree, [k]: !this.state.subtree[k] },
    });

  /**
   * Pour savoir si l'affichage des sous-timelines d'une timeline est activé
   * @param {string} k clé de la timeline
   * @returns boolean
   */
  isSubtreeOpen = (k) => !!this.state.subtree[k];


  /********************************************
   * Fonctions permettant de gérer l'ouverture de documents depuis divers composants,
   * ainsi que la recherche transverse
   ********************************************/

  /**
   * Recherche transverse
   * @param {string} docType type de document recherché
   * @param {string} searchTerm terme de recherche
   * @param {bool} allTime si True, on recherche sur l'ensemble des données, sinon entre startDate et endDate
   * @returns résultats de la recherche (réponse du backend)
   */
  transversalSearch = async (docType, searchTerm, allTime = false) => {
    let { input, startDate, endDate, dataPatient } = this.state;
		try {
    	const results = await search(this.props.authToken, input, allTime ? null : startDate, allTime ? null : endDate, searchTerm,
        SearchQueryMatching.EXACT, SearchQueryCombination.AND, docType);
    	return {
				results,
				startDate: allTime ? null : startDate,
				endDate: allTime ? null : endDate,
				patientName: `${dataPatient.gender === 'male' ? 'Mr.' : (dataPatient.gender === 'female' ? 'Mme.' : 'Mx.')} `
					+ `${dataPatient.name?.length && dataPatient.name[0].given ? dataPatient.name[0].given?.join(' ') : 'Inconnu'} ${dataPatient.name?.length && dataPatient.name[0]?.family ? dataPatient.name[0]?.family : 'Inconnu'}`
			};
		} catch(e) {
			if (e.name === 'HttpError' && e.code === 401)
				this.props.userSessionExpired();
			else {
				console.error(e);
			}

			throw e;
    }
  };

  /**
   * Ouverture d'un document
   * @param {string} doc_name nom du document (titre de l'onglet)
   * @param {ReactComponent} doc_content contenu du document
   */
  addDocumentTab = (doc_name, doc_content) => {
    const { openDocuments } = this.state;
    openDocuments.push([doc_name, doc_content]);
    this.setState({
      openDocuments: openDocuments,
    });
  };

  /**
   * Fermeture d'un onglet de document
   * @param {int} index index de l'onglet à fermer
   */
  removeDocumentTab = (index) => {
    const { openDocuments } = this.state;
    openDocuments.splice(index, 1);
    this.setState({
      openDocuments: openDocuments,
    });
  };

  logout = () => this.props.userLogout();

  render() {
    const {
      input,
      startDate,
      endDate,
      newStartDate,
      newEndDate,
      dataPatient,
      hospitalisationTimeline,
      consultationTimeline,
      timelinesDisplayConfig,
      timelinesDisplayConfigVisible,
      openDocuments,
    } = this.state;

    const pmsiTimeline = this.props.searchResults
      ? this.props.searchResults.pmsis
      : this.state.pmsiTimeline;
    const clinicalReportTimeline = this.props.searchResults
      ? this.props.searchResults.clinicalReports
      : this.state.clinicalReportTimeline;
    const qrMedicalTimeline = this.props.searchResults
      ? this.props.searchResults.qrMedical
      : this.state.qrMedicalTimeline;
    const qrParamedicalTimeline = this.props.searchResults
      ? this.props.searchResults.qrParamedical
      : this.state.qrParamedicalTimeline;
    const lrTimeline = this.props.searchResults
      ? this.props.searchResults.labResults
      : this.state.lrTimeline;
    const medicationTimeline = this.props.searchResults
      ? this.props.searchResults.medicationAdministrations
      : this.state.medicationTimeline;

    let disableDate = true;
    if (hospitalisationTimeline && dataPatient) {
      disableDate = false;
    }

    return (
      <div className="page-container">
        <div className="headerbar frow fjspace facenter fwrap">
          <div className="fcol fexpand">
            <div className="patient-name">
              {dataPatient &&
                `${dataPatient.gender === "male" ? "Mr." : dataPatient.gender === "female" ? "Mme." : "Mx."} ` +
                `${dataPatient.name?.length && dataPatient.name[0].given ? dataPatient.name[0].given?.join(" ") : "Inconnu"}
                 ${dataPatient.name?.length && dataPatient.name[0]?.family ? dataPatient.name[0]?.family : "Inconnu"}`
              }
            </div>

            <div className="patient-dates">
              {dataPatient &&
                `Né le ${moment(dataPatient.birthDate).format("DD/MM/YYYY")}` +
                  (dataPatient.deceasedDateTime ? ` - Décédé le ${moment(dataPatient.deceasedDateTime).format("DD/MM/YYYY")}` : "")}
            </div>
          </div>

          <div className="nav-controls frow fjspace fexpand fwrap">
            <div className="frow">
              <Input
                value={input}
                onChange={this.handleNip}
                onKeyDown={(e) => e.key === "Enter" && this.handleDataRefresh()}
                placeholder="NIP Patient"
                size="medium"
              />
              <Button
                onClick={this.handleDataRefresh}
                icon={<CheckOutlined />}
                type="primary"
                size="medium"
              />
            </div>

            <div className="frow">
              <DatePicker
                value={
                  newStartDate
                    ? moment(newStartDate)
                    : startDate
                    ? moment(startDate)
                    : null
                }
                onChange={_.partial(this.changeDate, true)}
                disabled={disableDate}
                format="DD/MM/YYYY"
                placeholder="Début"
                size="medium"
              />
              <DatePicker
                value={
                  newEndDate
                    ? moment(newEndDate)
                    : endDate
                    ? moment(endDate)
                    : null
                }
                onChange={_.partial(this.changeDate, false)}
                disabled={disableDate}
                format="DD/MM/YYYY"
                placeholder="Fin"
                size="medium"
              />
              <Button
                onClick={this.handleDataRefresh}
                disabled={!startDate || !endDate}
                icon={<CheckOutlined />}
                type="primary"
                size="medium"
              />
            </div>

            <div className="frow fgap">
              <Button
                onClick={this.handleTimelinesDisplayConfigOpen}
                disabled={!timelinesDisplayConfig}
              >
                Config. Timeline
              </Button>

              <Button onClick={this.logout} icon={<LogoutOutlined />} />

              <TimelineConfigModal
                visible={timelinesDisplayConfigVisible}
                timelineDisplayConfig={timelinesDisplayConfig || []}
                handleCloseModal={this.handleTimelinesConfigClose}
                updateConfigCallback={this.handleTimelinesDisplayConfigUpdate}
              ></TimelineConfigModal>
            </div>
          </div>
        </div>

        <div className="frow timelines-block">
          <div className="fcol tl-labels-col">
            {(hospitalisationTimeline || consultationTimeline) && (
              <div className="tl-label tl-label-large" title="Hospitalisation">
                Hospitalisation
              </div>
            )}
            {(hospitalisationTimeline || consultationTimeline) && (
              <div
                className="tl-label tl-label-large tl-label-axis-below"
                title="Consultations et séjours d'une journée"
              >
                Consultations / 1j
              </div>
            )}

            {pmsiTimeline && this.getTimelineVisible("PMSI") && (
              <div className="tl-label" title="PMSI">
                PMSI
                {this.timelineHasChildren("PMSI") && (
                  <button
                    className="tl-subtree-toggle-button"
                    onClick={() => this.toggleSubtree("PMSI")}
                  >
                    <RightOutlined
                      rotate={this.isSubtreeOpen("PMSI") ? 90 : 0}
                    />
                  </button>
                )}
              </div>
            )}
            {pmsiTimeline &&
              this.getTimelineVisible("PMSI") &&
              this.getSubTimelinesVisible("PMSI")
                .filter(this.subTimelineExists(pmsiTimeline))
                .map((a) => (
                  <div className="tl-label tl-label-subtree" key={a} title={a}>
                    {a}
                  </div>
                ))}

            {clinicalReportTimeline &&
              this.getTimelineVisible("Comptes Rendus") && (
                <div className="tl-label" title="Comptes Rendus">
                  Comptes Rendus
                  {this.timelineHasChildren("Comptes Rendus") && (
                    <button
                      className="tl-subtree-toggle-button"
                      onClick={() => this.toggleSubtree("Comptes Rendus")}
                    >
                      <RightOutlined
                        rotate={this.isSubtreeOpen("Comptes Rendus") ? 90 : 0}
                      />
                    </button>
                  )}
                </div>
              )}
            {clinicalReportTimeline &&
              this.getTimelineVisible("Comptes Rendus") &&
              this.getSubTimelinesVisible("Comptes Rendus")
                .filter(this.subTimelineExists(clinicalReportTimeline))
                .map((a) => (
                  <div className="tl-label tl-label-subtree" key={a} title={a}>
                    {a}
                  </div>
                ))}

            {qrMedicalTimeline &&
              this.getTimelineVisible("questionnaires médicaux") && (
                <div className="tl-label" title="Questionnaires médicaux">
                  Q. médicaux
                  {this.timelineHasChildren("questionnaires médicaux") && (
                    <button
                      className="tl-subtree-toggle-button"
                      onClick={() =>
                        this.toggleSubtree("questionnaires médicaux")
                      }
                    >
                      <RightOutlined
                        rotate={
                          this.isSubtreeOpen("questionnaires médicaux") ? 90 : 0
                        }
                      />
                    </button>
                  )}
                </div>
              )}
            {qrMedicalTimeline &&
              this.getTimelineVisible("questionnaires médicaux") &&
              this.getSubTimelinesVisible("questionnaires médicaux")
                .filter(this.subTimelineExists(qrMedicalTimeline))
                .map((a) => (
                  <div className="tl-label tl-label-subtree" key={a} title={a}>
                    {a}
                  </div>
                ))}

            {qrParamedicalTimeline &&
              this.getTimelineVisible("questionnaires paramédicaux") && (
                <div className="tl-label" title="Questionnaires paramédicaux">
                  Q. paramédicaux
                  {this.timelineHasChildren("questionnaires paramédicaux") && (
                    <button
                      className="tl-subtree-toggle-button"
                      onClick={() =>
                        this.toggleSubtree("questionnaires paramédicaux")
                      }
                    >
                      <RightOutlined
                        rotate={
                          this.isSubtreeOpen("questionnaires paramédicaux")
                            ? 90
                            : 0
                        }
                      />
                    </button>
                  )}
                </div>
              )}
            {qrParamedicalTimeline &&
              this.getTimelineVisible("questionnaires paramédicaux") &&
              this.getSubTimelinesVisible("questionnaires paramédicaux")
                .filter(this.subTimelineExists(qrParamedicalTimeline))
                .map((a) => (
                  <div className="tl-label tl-label-subtree" key={a} title={a}>
                    {a}
                  </div>
                ))}

            {lrTimeline && this.getTimelineVisible("Biologie") && (
              <div className="tl-label" title="Biologie">
                Biologie
                {this.timelineHasChildren("Biologie") && (
                  <button
                    className="tl-subtree-toggle-button"
                    onClick={() => this.toggleSubtree("Biologie")}
                  >
                    <RightOutlined
                      rotate={this.isSubtreeOpen("Biologie") ? 90 : 0}
                    />
                  </button>
                )}
              </div>
            )}
            {lrTimeline &&
              this.getTimelineVisible("Biologie") &&
              this.getSubTimelinesVisible("Biologie")
                .filter(this.subTimelineExists(lrTimeline))
                .map((a) => (
                  <div className="tl-label tl-label-subtree" key={a} title={a}>
                    {a}
                  </div>
                ))}

            {medicationTimeline && this.getTimelineVisible("Traitements") && (
              <div className="tl-label" title="Traitements">
                Traitements
                {this.timelineHasChildren("Traitements") && (
                  <button
                    className="tl-subtree-toggle-button"
                    onClick={() => this.toggleSubtree("Traitements")}
                  >
                    <RightOutlined
                      rotate={this.isSubtreeOpen("Traitements") ? 90 : 0}
                    />
                  </button>
                )}
              </div>
            )}
            {medicationTimeline &&
              this.getTimelineVisible("Traitements") &&
              this.getSubTimelinesVisible("Traitements")
                .filter(this.subTimelineExists(medicationTimeline))
                .map((a) => (
                  <div className="tl-label tl-label-subtree" key={a} title={a}>
                    {a}
                  </div>
                ))}
          </div>

          <div
            className="fcol fexpand tl-timelines-col"
            onMouseDown={this.handleTimelineDragEvent}
            onMouseUp={this.handleTimelineDragEvent}
            onWheel={this.handleTimeLineWheelEvent}
          >
            {(hospitalisationTimeline || consultationTimeline) && (
              <div className="fcol timeline">
                <SejoursTimeline
                  hospitalisationTimeline={hospitalisationTimeline}
                  consultationTimeline={consultationTimeline}
                  startDate={startDate}
                  endDate={endDate}
                  onChangeTimeRange={this.changeTimeRange}
                />
              </div>
            )}

            {pmsiTimeline && this.getTimelineVisible("PMSI") && (
              <div className="fcol timeline">
                <PmsiTimeline
                  color={[30, 0.5, 0.7]}
                  subcolor={[30, 0.4, 0.4]}
                  timeline={pmsiTimeline}
                  startDate={startDate}
                  endDate={endDate}
                  openDocumentCallback={this.addDocumentTab}
                  visibleSubTimelines={this.getSubTimelinesVisible("PMSI")}
                />
              </div>
            )}

            {clinicalReportTimeline &&
              this.getTimelineVisible("Comptes Rendus") && (
                <div className="fcol timeline">
                  <DocumentsTimeline
                    color={[290, 0.4, 0.7]}
                    subcolor={[290, 0.4, 0.5]}
                    timeline={clinicalReportTimeline}
                    startDate={startDate}
                    endDate={endDate}
                    openDocumentCallback={this.addDocumentTab}
                    visibleSubTimelines={this.getSubTimelinesVisible(
                      "Comptes Rendus"
                    )}
                  />
                </div>
              )}

            {qrMedicalTimeline &&
              this.getTimelineVisible("questionnaires médicaux") && (
                <div className="fcol timeline">
                  <QrTimeline
                    color={[230, 0.6, 0.5]}
                    subcolor={[230, 0.6, 0.3]}
                    timeline={qrMedicalTimeline}
                    startDate={startDate}
                    endDate={endDate}
                    openDocumentCallback={this.addDocumentTab}
                    visibleSubTimelines={this.getSubTimelinesVisible(
                      "questionnaires médicaux"
                    )}
                  />
                </div>
              )}

            {qrParamedicalTimeline &&
              this.getTimelineVisible("questionnaires paramédicaux") && (
                <div className="fcol timeline">
                  <QrTimeline
                    color={[230, 0.6, 0.7]}
                    subcolor={[230, 0.6, 0.5]}
                    timeline={qrParamedicalTimeline}
                    startDate={startDate}
                    endDate={endDate}
                    openDocumentCallback={this.addDocumentTab}
                    visibleSubTimelines={this.getSubTimelinesVisible(
                      "questionnaires paramédicaux"
                    )}
                  />
                </div>
              )}

            {lrTimeline && this.getTimelineVisible("Biologie") && (
              <div className="fcol timeline">
                <LrTimeline
                  color={[160, 0.5, 0.5]}
                  subcolor={[160, 0.5, 0.3]}
                  timeline={lrTimeline}
                  startDate={startDate}
                  endDate={endDate}
                  openDocumentCallback={this.addDocumentTab}
                  visibleSubTimelines={this.getSubTimelinesVisible("Biologie")}
                />
              </div>
            )}

            {medicationTimeline && this.getTimelineVisible("Traitements") && (
              <div className="fcol timeline">
                <MedicationTimeline
                  color={[350, 0.6, 0.7]}
                  timeline={medicationTimeline}
                  startDate={startDate}
                  endDate={endDate}
                  openDocumentCallback={this.addDocumentTab}
                />
              </div>
            )}
          </div>
        </div>

        <div className="frow fexpand bottom-block">
          <div className="search-block">
            {dataPatient && (
              <SearchPane
                patientId={input}
                searchStartDate={newStartDate || startDate || null}
                searchEndDate={newEndDate || endDate || null}
                onOpenDocument={this.addDocumentTab}
                getTimelineVisibleFunction={this.getTimelineVisible}
                timelinesDisplayConfig={timelinesDisplayConfig}
              />
            )}
          </div>

          {((openDocuments && openDocuments.length > 0) ||
            this.props.suggestions) && (
            <div className="documents-block">
              <DocumentTabs
                openDocuments={openDocuments}
                currentNbDoc={openDocuments ? openDocuments.length : 0}
                suggestions={this.props.suggestions}
                addDocCallback={this.addDocumentTab}
                removeDocCallback={this.removeDocumentTab}
                transversalSearchCallback={this.transversalSearch}
                clearSuggestionsCallback={this.props.clearSuggestions}
              ></DocumentTabs>
            </div>
          )}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    authToken: state.session.authToken,
    testPatient: state.patient,
    searchResults: state.search.results ? state.search.results.results : null,
    suggestions: state.search.suggestions,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    { ...DashboardActions, clearSuggestions, userLogout, userSessionExpired },
    dispatch
  );
}

const ConnectedDashboard = tooltipWrapper(
  popinWrapper(connect(mapStateToProps, mapDispatchToProps)(Dashboard))
);
export { ConnectedDashboard };
