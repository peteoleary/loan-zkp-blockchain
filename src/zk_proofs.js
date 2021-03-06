
const CircomCompiler = require('./circom_compiler')
const deploy = require('./deploy')
const compile = require('./compile')
const Handlebars = require('handlebars')
const fs = require('fs')

const snarkjs = require("snarkjs");

const ffjavascript = require('ffjavascript')
const unstringifyBigInts = ffjavascript.utils.unstringifyBigInts

function p256$1(n) {
  let nstr = n.toString(16);
  while (nstr.length < 64) nstr = "0"+nstr;
  nstr = `0x${nstr}`;
  return nstr;
}

// lifted and modified from snarkjs
function groth16ExportSolidityCallData(proof, pub) {

  const inputs = pub.map(x => p256$1(x));

  const a = [p256$1(proof.pi_a[0]), p256$1(proof.pi_a[1])]
  const b = [[p256$1(proof.pi_b[0][1]), p256$1(proof.pi_b[0][0])],[p256$1(proof.pi_b[1][1]), p256$1(proof.pi_b[1][0])]]
  const c = [p256$1(proof.pi_c[0]), p256$1(proof.pi_c[1])]

  return [a, b, c, inputs];
}

class ZKProof {
    constructor (base, name) {

        if (!name || name.length == 0) throw "ZKProof name must not be empty"

        name = name.replace(/[\.\@]/g, '_').replace('__', '_')
        this._base = base
        this._name = name
        this._cc = new CircomCompiler(this.makeCircuitName())
    }

    async getStatus() {
        return {
            // TODO: same results as makeAll()
            'circuit': { 'circuit': this._cc.get_circuit()},
            // TODO: same results as deployContract
            'contract': await this.contractInfo()
        }
    }

    name() {
        return this._name
    }

    contract_name() {
        return this._cc.get_contract_name()
    }

    resolveTemplate(template_name, vars) {
        var template_text = fs.readFileSync(`circuits/${template_name}.template`, 'utf8')
      
        var template = Handlebars.compile(template_text);
        return template(vars)
      }
      
    makeCircuitName() {
        return `${this._base}_${this._name}`
      }
      
    async makeCircuit (vars) {
        const resolvedCircuit = this.resolveTemplate(`${this._base}.circom`, vars)
        
        const circuit_path = `circuits/${this.makeCircuitName()}.circom`
        fs.writeFileSync(circuit_path, resolvedCircuit, 'utf8')

        const json_path = `circuits/${this.makeCircuitName()}.json`
        fs.writeFileSync(json_path, JSON.stringify(vars), 'utf8')

        return circuit_path 
    }

    async makeAll() {
        const results = {}
        results['circuit'] = await this._cc.compile_circuit(true)
        results['witness'] = await this._cc.generate_witness()
        results['zkey'] = await this._cc.create_zkey()
        results['proof'] = await this._cc.create_proof()
        results['contract'] = await this._cc.create_contract()
        return Promise.resolve(results)
    }

    async compileContract() {
        const result = compile(this._cc.get_contract_name())
        return Promise.resolve(result)
    }

    async deployContract() {
        const result = deploy(this._cc.get_contract_name())
        return Promise.resolve(result)
    }

    async getContract() {
        try {
            const hre = require("hardhat");
            const {ethers, deployments, getNamedAccounts} = hre;

            const network = await deployments.getNetworkName();

            if (network.name == 'hardhat') {
                await deployments.fixture([this._cc.get_contract_name()]);
            }

            const {verifier, _} = await getNamedAccounts();
            return ethers.getContract(this._cc.get_contract_name(), verifier);
        } catch (err) {
            // return resolved value here or await will re-throw
            return Promise.resolve({err: err})
        }
        
    }

    async contractInfo() {
        const loan_verifier = await this.getContract()
        return loan_verifier
    }

    async callContract(proof, publicSignals) {

        // TODO: pull all the hardhat specific code together from here, deploy.js and compile.js
        const loan_verifier = await this.getContract()

        // const { proof, publicSignals } = await snarkjs.groth16.fullProve({income: 300000, nonce: '0x1234567890abcdef'}, "./circuits/loan.wasm", "./circuits/loan.zkey")
        // from https://githubhot.com/repo/iden3/snarkjs/issues/112
        const [a, b, c, i] = groth16ExportSolidityCallData(unstringifyBigInts(proof), unstringifyBigInts(publicSignals))

        const output = await loan_verifier.verifyProof(a, b, c, i);

        return output
    }
}

module.exports = ZKProof