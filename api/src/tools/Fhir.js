import fetch from 'node-fetch';

/**
 * fhir API wrapper.
 * @example
 * // returns instance
 * new fhir('http', '29.54.23.45', '8080');
 * @returns { Object } Returns an instance of the class.
 */
class Fhir {
    constructor(protocol , ip, port) {
        this.rt = [
            'patients',
            'encounters',
        ];
        this.sb = [
            'labResults',
            'clinicalReports',
            'medicationAdministrations',
            'procedures',
            'pmsis',
            'questionnaireResponses',
            'bacteriology',
            'encounters',
        ];
        //If there is a "s" in protocol (http or https)
        if ([...protocol.matchAll(/s/g)].length > 0) {
            this.u = 'https://';
        } else {
            this.u = 'http://';
        }
        this.u = this.u + ip.replace(/\//g, '') + ':' + port.replace(/\//g, '');
    }

    async getJson(url){
        const a = await fetch(url)
            .catch(err => {throw new Error(`FHIRClient error: ${err}`);})
            .then((r) => {
                if (!r.ok) {
                    return r.status; // Throw error instead ?
                }
                return r.json();
            });
        return a;
    }
    /**
   * uri method
   * @example
   * // http://29.54.23.45:8080/
   * uri();
   * @returns { String } Returns the formatted URI.
   */
    uri() {
        return this.u + '/';
    }

    /**
   * get method
   * @example
   * // {"birthDate":"1901-01-04T00:00:00","deceasedDateTime":"2050-01-01T00:00:00","gender":"male","id":"2","identifier":[{"system":"CHU_BORDEAUX","value":"1"}],"resourceType":"Patient"}
   * await get('patients', 3, '');
   * @returns { Promise } Returns promised response from the API
   */
    get(route, id, subroute){
        const k = route === this.rt[1] ? 1 : 0;
        let i = 0;
        const len = this.sb.length;
        while (i < len) {
            if (this.sb[i] === subroute) {
                return this.getJson(`${this.u}/${this.rt[k]}/${id}/${this.sb[i]}`);
            }
            ++i;
        }
        return this.getJson(`${this.u}/${this.rt[k]}/${id}`);
    }

    async getAll(route, id) {
        const p = [];
        const k = route === this.rt[1] ? 1 : 0;
        let i = 0;
        const len = this.sb.length;
        while (i < len) {
            p.push(this.getJson(`${this.u}/${this.rt[k]}/${id}/${this.sb[i]}`));
            ++i;
        }
        p.push(this.getJson(`${this.u}/${this.rt[k]}/${id}`));
        const pp = await Promise.allSettled(p).then((e) => {
            return e.map((x, i) => [ this.sb[i] ? this.sb[i] : this.rt[k], x.value ]);
        });
        return {
            [this.rt[k]] : Object.fromEntries(pp),
        };
    }

}

export { Fhir };
