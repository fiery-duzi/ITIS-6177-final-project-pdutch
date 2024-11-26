const express = require('express')
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { check } = require('express-validator')
const { validationResult } = require('express-validator/lib')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const cors = require('cors')

const app = express()
const port = 3000
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
 *         description: Generates speech from text.
 *         consumes:
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
 *                           maxLength: 100
 *         responses:
 *             200:
 *                 description: Successfully rendered text as speech.
 *             400:
 *                 description: Invalid input.
 */
app.post('/text2speech', check('text').notEmpty().isLength({max: 100}), async (req, res) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    const text = req.body.text;
    var audioFile = "YourAudioFile.mp3";
    // This example requires environment variables named "SPEECH_KEY" and "SPEECH_REGION"
    const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);

    // The language of the voice that speaks.
    speechConfig.speechSynthesisVoiceName = "en-US-AvaMultilingualNeural";

    // Create the speech synthesizer.
    var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(text,
      function (result) {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log("synthesis finished.");
        } else {
          console.error("Speech synthesis canceled, " + result.errorDetails +
            "\nDid you set the speech resource key and region values?");
        }
        synthesizer.close();
        synthesizer = null;
      },
      function (err) {
        console.trace("err - " + err);
        synthesizer.close();
        synthesizer = null;
      });
    console.log("Now synthesizing to: " + audioFile);

    return res.send(text);
  }
  res.status(400).send({ errors: result.array() });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})