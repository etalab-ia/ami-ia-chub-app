/**
* getEncountersInPmsis() Getting all the encounters ID in PMSIS from a Patient
* @param { pmsis } is an array of all pmsis of a patient
*/
const getEncountersInPmsis = (pmsis) => {

    const encountersList = pmsis.reduce((acc, curr) => {
        const encounter = curr?.item[0]?.encounter[0]?.reference;
        const encounterNum = encounter.split('/')[1];
        if (!(acc.includes(encounterNum))){
            acc.push(encounterNum);
        }
        return acc;
    }, []);

    return encountersList;
};

module.exports = {
    getEncountersInPmsis,
};
