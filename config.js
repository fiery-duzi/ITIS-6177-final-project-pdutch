
const sdk = require("microsoft-cognitiveservices-speech-sdk");

const config = {
  port: 3000,
  audioFileOutputDir: "output",
  audioFileExtension: ".mp3",
  fileLimit: 100,
  speechConfig: sdk.SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION),
  swaggerOptions: {
    swaggerDefinition: {
      info: {
        title: 'Text to Speech API using Azure',
        version: '1.3.3.7',
        description: 'Patrick Dutch\'s ITIS-6177 final project. This API uses Azure Speech Service to render text to speech.'
      },
      host: '146.190.219.226:' + 3000,
      basePath: '/',
      definitions: {
        ValidationError: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              msg: {
                type: 'string',
                example: 'Invalid value'
              },
              param: {
                type: 'string',
                example: 'text'
              },
              location: {
                type: 'string',
                example: 'body'
              }
            }
          }
        }
      }
    },
    apis: ['./text2speech.js']
  }
};

module.exports = config;