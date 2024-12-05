# Text2Speech API

The `text2speech` API provides endpoints to convert text into speech using Microsoft's Azure AI Speech Service. It supports generating audio files from text, retrieving generated audio files, deleting audio files, and listing available voices for text-to-speech conversion.

![Text2Speech API](https://images.squarespace-cdn.com/content/v1/584ee3cc2994cac9e545aadd/1614723936610-2YKDTL8LYQ5H2HT147LG/image2.png?format=2500w)

## Endpoints

### POST /text2speech
Generates speech from text and returns a key to retrieve the audio file.

### GET /text2speech/{fileKey}
Retrieves the previously generated audio file with the given key.

### DELETE /text2speech/{fileKey}
Deletes the previously generated audio file with the given key.

### GET /text2speech
Retrieves all previously generated audio file keys.

### GET /voices
Retrieves a filtered list of available voices that can be used for text-to-speech conversion.

## Swagger Documentation

The API is documented using Swagger. You can access the Swagger UI to explore the API endpoints and their details.

1. Open your web browser.
2. Navigate to `http://146.190.219.226:3000/docs`.
3. You will see the Swagger UI where you can interact with the API endpoints and see detailed information about each one. You can even listen to the generated audio directly in Swagger without downloading the audio files to your computer!

## How to Use the API with Postman

### Creating an Audio File

1. Open Postman and create a new POST request.
2. In the request URL, enter `http://146.190.219.226:3000/text2speech`.
3. Go to the "Body" tab and select "raw" and "JSON" from the dropdown.
4. In the text area, enter the following JSON.
   - The voice param is optional. If you're curious about which voices you can use, see the "Retrieving Available Voices" section below.
```json
{
    "text": "whatever you want to say!",
    "voice": "en-US-EmmaNeural"
}
```
5. Click "Send" to send the request.
6. You will receive a response containing a fileKey which you can use to retrieve the audio file. Copy this file key.

### Retrieving an Audio File

1. Open Postman and create a new GET request.
2. In the request URL, enter `http://146.190.219.226:3000/text2speech/{fileKey}`, replacing `{fileKey}` with the key you received from the POST request above.
3. Click "Send" to send the request.
4. The audio file will be returned in the response.
5. Click "Save Response", then "Save to a file".
6. Play the audio file with the audio program of your choice!

### Deleting an Audio File

1. Open Postman and create a new DELETE request.
2. In the request URL, enter `http://146.190.219.226:3000/text2speech/{fileKey}`, replacing `{fileKey}` with the key of the audio file you want to delete.
3. Click "Send" to send the request.
4. You will receive a response indicating that the file has been deleted.

### Listing All Audio Files

1. Open Postman and create a new GET request.
2. In the request URL, enter `http://146.190.219.226:3000/text2speech`.
3. Click "Send" to send the request.
4. You will receive a list of all previously generated audio file keys.

### Retrieving Available Voices

1. Open Postman and create a new GET request.
2. In the request URL, enter `http://146.190.219.226:3000/voices`.
3. Optionally, you can add query parameters to filter the voices:
   - `locale`: The locale in BCP-47 format to filter voices by (e.g., `en-US`).
   - `gender`: The gender to filter voices by (`Female`, `Male`, `Neutral`).
   Example URL with query parameters: `http://146.190.219.226:3000/voices?locale=en-US&gender=Female`
4. Click "Send" to send the request.
5. You will receive a list of available voices for text-to-speech conversion, which you can use to create an audio file in the "Creating an Audio File" section.






