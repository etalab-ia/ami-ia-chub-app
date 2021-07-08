const assert = require('assert');
const fhir = require('../src/fhir.js');

beforeEach(async function () {
  //
});

const ip = '192.168.222.218';
const port = '5000';

describe('fhir', () => {

  describe('#uri()', () => {
    it('should return the formatted uri', async () => {
      const f = new fhir('http', ip, port);
      assert.equal(`http://${ip}:${port}/`, f.uri());
    });
  });

  describe('#get()', () => {
    const f = new fhir('http', ip, port);
    it('should return an object', async () => {
      const r = await f.get('patients', 2);
      assert.equal(typeof r, 'object');
    });
    it('should return an object', async () => {
      const r = await f.get('this route doest exxxiisst', 2, 'wttttttttf');
      assert.equal(typeof r, 'object');
    });
  });
});
