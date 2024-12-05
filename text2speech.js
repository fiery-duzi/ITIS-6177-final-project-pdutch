const express = require('express')
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { check, validationResult } = require('express-validator')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const cors = require('cors')
const path = require('node:path');
const { accessSync, constants, readdirSync, unlinkSync } = require('node:fs');
const crypto = require('crypto');
const morgan = require('morgan');
const { SynthesisVoiceGender } = require('microsoft-cognitiveservices-speech-sdk/distrib/lib/src/sdk/VoiceInfo');
const config = require('./config');

const app = express()

const specs = swaggerJsDoc(config.swaggerOptions);

app.use(express.json());
app.use(cors());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(morgan('dev'));

/**
 * @swagger
 * /text2speech:
 *     post:
 *         tags:
 *             - text2speech
 *         description: Generates speech from text, returning a key to retrieve the audio file.
 *         consumes:
 *             - application/json
 *         produces:
 *             - application/json
 *         parameters:
 *             - in: body
 *               name: request
 *               description: The text to render as speech. Max length is 100 characters. Retrieve valid voices for the voice param with /voices.
 *               schema:
 *                   type: object
 *                   required:
 *                       - text
 *                   properties:
 *                       text:
 *                           type: string
 *                           example: I'm tired, boss.
 *                           maxLength: 100
 *                       voice:
 *                           type: string
 *                           example: en-US-AvaMultilingualNeural
 *         responses:
 *             200:
 *                 description: Successfully generated audio file with name given by fileKey.
 *                 schema:
 *                   type: object
 *                   properties:
 *                       fileKey:
 *                           type: string
 *                           example: 4fb17d8895bee64a574ff14bf44ad1fb
 *             400:
 *                 description: Invalid input.
 *                 schema:
 *                   $ref: '#/definitions/ValidationError'
 *             500:
 *                 description: Failed to generate speech for given text.
 *                 schema:
 *                   type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Failed to generate text to speech."
 *             507:
 *                 description: File storage limit has been reached.
 *                 schema:
 *                   type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "File storage limit has been reached. Please delete some files and try again."
 */
app.post('/text2speech', [
  check('text').notEmpty().isLength({ max: 100 }),
  check('voice').optional().isString().isLength({ max: 50 })
], async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).send(result.array());
  }

  const audioFileName = md5Hash();
  if (fileWithKeyExists(audioFileName)) {
    // File already exists, return the file key directly.
    return res.json({ fileKey: audioFileName });
  }

  if (hasGeneratedFileLimitBeenReached()) {
    // To avoid filling up the server, limit the number of files that can be generated.
    return res.status(507).json({ error: "File storage limit has been reached. Please delete some files and try again." });
  }

  generateSpeechFromText();

  function hasGeneratedFileLimitBeenReached() {
    const files = readdirSync(config.audioFileOutputDir);
    return files.length > config.fileLimit;
  }

  function md5Hash() {
    // Hash the entire request body to tie generated audio file to request.
    return crypto.createHash("md5").update(JSON.stringify(req.body)).digest("hex");
  }

  function generateSpeechFromText() {
    const audioFile = `${config.audioFileOutputDir}/${audioFileName}${config.audioFileExtension}`;

    config.speechConfig.speechSynthesisVoiceName = req.body.voice;
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);
    const synthesizer = new sdk.SpeechSynthesizer(config.speechConfig, audioConfig);

    const text2SpeechErrorMsg = "Failed to generate text to speech.";
    synthesizer.speakTextAsync(req.body.text,
      function (result) {
        console.log(`Synthesize result: ${result.reason}`);
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          res.json({
            fileKey: audioFileName
          });
        } else {
          res.status(500).json({ error: text2SpeechErrorMsg });
        }
        synthesizer.close();
      },
      function (err) {
        console.error(err);
        synthesizer.close();
        res.status(500).json({ error: text2SpeechErrorMsg });
      });
  }
})

/**
 * @swagger
 * /text2speech/{fileKey}:
 *     get:
 *         tags:
 *             - text2speech
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
 *                 content:
 *                   audio/mpeg:
 *                     schema:
 *                       type: string
 *                       format: binary
 *             400:
 *                 description: Invalid input.
 *                 schema:
 *                   $ref: '#/definitions/ValidationError'
 */
app.get('/text2speech/:fileKey', check('fileKey').isMD5().bail().custom(value => fileWithKeyExists(value)), async (req, res) => {
  const result = validationResult(req);
  const audioFileName = req.params.fileKey + config.audioFileExtension;
  if (!result.isEmpty()) {
    return res.status(400).send(result.array());
  }
  retrieveAudioFile();

  function retrieveAudioFile() {
    const options = {
      root: path.join(__dirname, config.audioFileOutputDir)
    }
    res.sendFile(audioFileName, options);
  }
})

/**
 * @swagger
 * /text2speech/{fileKey}:
 *     delete:
 *         tags:
 *             - text2speech
 *         description: Deletes the previously generated audio file with the given key.
 *         parameters:
 *             - in: path
 *               name: fileKey
 *               required: true
 *               type: string
 *               description: The file to delete by key.
 *               example: 4fb17d8895bee64a574ff14bf44ad1fb
 *         responses:
 *             200:
 *                 description: Successfully deleted the audio file.
 *                 schema:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "File successfully deleted."
 *             400:
 *                 description: Invalid input.
 *                 schema:
 *                   $ref: '#/definitions/ValidationError'
 */
app.delete('/text2speech/:fileKey', check('fileKey').isMD5().bail().custom(value => fileWithKeyExists(value)), async (req, res) => {
  const result = validationResult(req);
  const audioFileName = req.params.fileKey + config.audioFileExtension;
  if (!result.isEmpty()) {
    return res.status(400).send(result.array());
  }

  unlinkSync(`${config.audioFileOutputDir}/${audioFileName}`);
  res.status(200).json({ message: "File successfully deleted." });
});

/**
 * @swagger
 * /text2speech:
 *     get:
 *         tags:
 *             - text2speech
 *         description: Retrieves all previously generated audio file keys.
 *         produces:
 *             - application/json
 *         responses:
 *             200:
 *                 description: Successfully retrieved all audio file keys.
 *                 schema:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: 4fb17d8895bee64a574ff14bf44ad1fb
 */
app.get('/text2speech', async (req, res) => {
  const files = readdirSync(config.audioFileOutputDir);
  res.json(files.map(file => file.replace(config.audioFileExtension, "")));
})

/**
 * @swagger
 * /voices:
 *     get:
 *         tags:
 *             - voices
 *         description: Retrieves a filtered list of available voices that can be used for text to speech.
 *         produces:
 *             - application/json
 *         parameters:
 *             - in: query
 *               name: locale
 *               required: false
 *               type: string
 *               description: The locale in BCP-47 format to filter voices by.
 *               example: en-US - See [Supported Languages](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts#supported-languages) for options.
 *             - in: query
 *               name: gender
 *               required: false
 *               type: string
 *               description: The gender to filter voices by.
 *               enum: [Female, Male, Neutral]
 *               example: Female
 *         responses:
 *             200:
 *                 description: Successfully retrieved the list of voices.
 *                 schema:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: en-US-AvaMultilingualNeural
 *             400:
 *                 description: Invalid input.
 *                 schema:
 *                   $ref: '#/definitions/ValidationError'
 */
app.get('/voices', [
  check('locale').optional().matches(/^[a-zA-Z0-9-]+$/).isLength({ max: 15 }),
  check('gender').optional().isIn(['Female', 'Male', 'Neutral'])
], async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).send(result.array());
  }

  const locale = req.query.locale;
  const gender = req.query.gender;
  const synthesizer = new sdk.SpeechSynthesizer(config.speechConfig);

  try {
    const result = await synthesizer.getVoicesAsync(locale);
    if (result.reason === sdk.ResultReason.VoicesListRetrieved) {
      let voices = result.voices;
      if (gender) {
        const genderEnum = {
          Female: SynthesisVoiceGender.Female,
          Male: SynthesisVoiceGender.Male,
          Neutral: SynthesisVoiceGender.Neutral
        };
        voices = voices.filter(voice => voice.gender === genderEnum[gender]);
      }
      res.json(voices.map(voice => voice.shortName));
    } else {
      res.status(500).json({ error: "Failed to retrieve voices." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve voices." });
  } finally {
    synthesizer.close();
  }
});

function fileWithKeyExists(fileKey) {
  try {
    accessSync(`${config.audioFileOutputDir}/${fileKey}${config.audioFileExtension}`, constants.F_OK);
  } catch (error) {
    // File was not found.
    return false;
  }
  return true;
}

app.listen(config.port, () => {
  console.log(`text2speech app listening on port: ${config.port}`);
});