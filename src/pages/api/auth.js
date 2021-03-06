const crypto = require('crypto')
const ZKProof = require('../../zk_proofs')

async function handler(req, res) {
  // TODO: verify captchaCode
  // https://developers.google.com/recaptcha/docs/verify#api-request
  var hash = '0x' + crypto.createHash('md5').update(req.body.captchaCode).digest('hex');
  const zkp = new ZKProof('auth', req.body.email)
  await zkp.makeCircuit({captchaCodeHash: hash})
  const results = await zkp.makeAll()
  return res.status(200).json({...results, captchaCodeHash: hash })
}
  
module.exports = handler