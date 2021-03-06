const { expect } = require('chai');
const  fs  = require('fs');
const ZKProof = require('../src/zk_proofs')

describe("zk proofs instance", function () {

    test('regularizes circuit name',  async () => {
        const z =  await new ZKProof('auth', 'pete@timelight.com')
        expect(z.name()).to.eq('pete_timelight_com')
        expect(z.contract_name()).to.eq('AuthPeteTimelightComVerifier')
    }, 30000)

    test('makes a circuit',  async () => {
        const circuit_path =  await new ZKProof('auth', 'pete@timelight.com').makeCircuit({captchaCodeHash: '0x123456789abcdef'})
        expect(circuit_path).to.eq('circuits/auth_pete_timelight_com.circom')
    }, 30000)

    test('compiles circuits programatically',  async () => {
        const results = await new ZKProof('auth', 'pete@timelight.com').makeAll()

        expect(results['circuit']).to.not.equal(null)

        expect(fs.existsSync('circuits/auth_pete_timelight_com')).to.equal(true)
        expect(fs.existsSync('circuits/auth_pete_timelight_com/auth_pete_timelight_com.zkey')).to.equal(true)
        expect(fs.existsSync('contracts/AuthPeteTimelightComVerifier.sol')).to.equal(true)
    }, 30000)

    test('compiles contract',  async () => {
        await new ZKProof('auth', 'pete@timelight.com').compileContract()
        expect(fs.existsSync('artifacts/contracts/AuthPeteTimelightComVerifier.sol/AuthPeteTimelightComVerifier.json')).to.equal(true)
    }, 30000)
    
    test('deploys contract',  async () => {
        return await new ZKProof('auth', 'pete@timelight.com').deployContract()
    }, 30000)

    test('gets contract status',  async () => {
        const status = await new ZKProof('auth', 'pete@timelight.com').getStatus()
        expect (status.circuit).to.not.eq(null)
        expect (status.deploy.address).to.not.eq(null)
    }, 30000)

    test('tests contract',  async () => {
        new ZKProof('auth', 'pete@timelight.com').callContract()
    }, 30000)
});