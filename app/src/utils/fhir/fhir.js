import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr')

// bacteriology: Array []
// clinicalReports: Array []
// labResults: Array []
// medicationAdministrations: Array []
// pmsis: Array []
// procedures: Array []
// questionnaireResponses: Array []

// [{
//   id: 1,
//   group: 4,
//   title: 'wtf',
//   start_time: moment(date).startOf('day'),
//   end_time: moment(date).startOf('day').add(1, 'day')
// },
// {
//   id: 2,
//   group: 4,
//   title: 'item title',
//   start_time: moment(date).startOf('day'),
//   end_time: moment(date).startOf('day').add(1, 'day')
// },
// {
//   id: 3,
//   group: 4,
//   title: 'title',
//   start_time: moment(date).startOf('day'),
//   end_time: moment(date).startOf('day').add(1, 'day')
// }]

/**
 *
 * @example
 * //
 *
 * @returns { Array<Any>, Array<Any> } Returns array of items for the timeline by id,
* and corresponding array of shallow copies of parts of the patient object linked with ids.
 */

(patient) => {

  // clinicalReports : { 'issued':'DATE', ... }
  // labResults : { 'effectiveDateTime' :'DATE' }
  // medicationAdministrations : { 'effectiveDateTime' :'DATE' }
  // pmsi : { 'created': 'DATE', ... }
  // procedures : { performedDateTime : 'DATE' }
  // questionnaireResponses : { authored : 'DATE' }
  // bacteriology : ?

  if (patient.clinicalReports?[].issued) {

  }

}


// export default getDates;



















//
