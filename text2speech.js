const express = require('express')
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { check } = require('express-validator')
const { validationResult } = require('express-validator/lib')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const cors = require('cors')
const path = require('node:path');
const crypto = require('crypto');

const app = express()
const port = 3000
const audioFileOutputDir = "output";
const audioFileExtension = ".mp3";
const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'Text to Speech API using Azure',
      version: '1.3.3.7',
      description: 'Patrick Dutch\'s ITIS-6177 final project. This API uses Azure Speech Service to render text to speech.'
    },
    host: '146.190.219.226:' + port,
    basePath: '/'
  },
  apis: ['./text2speech.js']
}
const specs = swaggerJsDoc(swaggerOptions)

app.use(express.json())
app.use(cors())
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs))


/**
 * @swagger
 * /text2speech:
 *     post:
 *         description: Generates speech from text, returning a key to retrieve the audio file.
 *         consumes:
 *             - application/json
 *         produces:
 *             - application/json
 *         parameters:
 *             - in: body
 *               name: request
 *               description: The text to render as speech.
 *               schema:
 *                   type: object
 *                   required:
 *                       - text
 *                   properties:
 *                       text:
 *                           type: string
 *                           example: I'm tired, boss.
 *                           maxLength: 100
 *         responses:
 *             200:
 *                 description: Successfully generated audio file with name given by fileKey.
 *                 schema:
 *                   type: object
 *                   properties:
 *                       fileKey:
 *                           type: string
 *             400:
 *                 description: Invalid input.
 *             500:
 *                 description: Failed to generate speech for given text.
 */
app.post('/text2speech', check('text').notEmpty().isLength({ max: 100 }), async (req, res) => {
  const result = validationResult(req);
  const text = req.body.text;
  if (result.isEmpty()) {
    generateSpeechFromText();
  } else {
    res.status(400).send({ errors: result.array() });
  }

  function md5Hash() {
    return crypto.createHash("md5").update(text).digest("hex");
  }

  function generateSpeechFromText() {
    const audioFileName = md5Hash();
    const audioFile = `${audioFileOutputDir}/${audioFileName}${audioFileExtension}`;

    const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);
    speechConfig.speechSynthesisVoiceName = "en-US-AvaMultilingualNeural";
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    const text2SpeechErrorMsg = "Failed to generate text to speech.";
    synthesizer.speakTextAsync(text,
      function (result) {
        console.log(`Synthesize result: ${result.reason}`);
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          res.json({
            fileKey: audioFileName
          });
        } else {
          res.status(500).send(text2SpeechErrorMsg);
        }
        synthesizer.close();
      },
      function (err) {
        console.error(err);
        synthesizer.close();
        res.status(500).send(text2SpeechErrorMsg);
      });
  }
})

/**
 * @swagger
 * /text2speech/{fileKey}:
 *     get:
 *         description: Retrieves the previously generated audio file with given key.
 *         produces:
 *             - audio/mpeg
 *         parameters:
 *             - in: path
 *               name: fileKey
 *               required: true
 *               type: string
 *               description: The file to retrieve by key.  
 *               example: 4fb17d8895bee64a574ff14bf44ad1fb     
 *         responses:
 *             200:
 *                 description: Successfully retrieved the audio file.
 *             400:
 *                 description: Invalid input.
 *             404:
 *                 description: No file found with given key.
 */
app.get('/text2speech/:fileKey', check('fileKey').notEmpty().isLength({ max: 100 }), async (req, res) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    retrieveAudioFile();
  } else {
    res.status(400).send({ errors: result.array() });
  }

  function retrieveAudioFile() {
    const options = {
      root: path.join(__dirname, audioFileOutputDir)
    }
    res.sendFile(req.params.fileKey + audioFileExtension, options);
  }
})

app.listen(port, () => {
  console.log(`text2speech app listening on port: ${port}`)
})