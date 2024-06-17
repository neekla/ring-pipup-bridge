/*
 * app.js
 *
 * This node application acts as a bridge between the ring-client-api and the PiPup Android
 * application to show Ring camera snapshots as an overlay/popup on Android TV devices.
 *
 * Remember to change the tvIpAddress variable and save your API token to token.txt.
 */

// Dependencies
const Ring = require('ring-client-api')
const fs = require('fs')
const request = require('request')
const { promisify } = require('util')
const { exit } = require('process')
require('dotenv').config()

// Configuration
const tvIpAddresses = process.env.IP_ADDRESSES.split(',') // Comma separated IP addresses of the Android TVs you are running PiPup on
const duration = process.env.DISPLAY_TIME || 12 // Display time for notifications, in seconds

/**
 * Sends a notification to PiPup app on Android TV.
 * @param {*} title Title of notification message.
 * @param {*} message Text of notification message.
 * @param {*} imageFile Path to image file, can be blank string to display no image.
 * @param {*} exitAfter If true, calls process.exit() after completing request.
 */
async function sendNotification(title, message, imageFile, exitAfter = false) {
    const optionsTemplate = {
        method: "POST",
        headers: {
            "Content-Type": "multipart/form-data"
        },
        formData: {
            duration,
            "position": 0,
            title,
            "titleColor": "#0066cc",
            "titleSize": 20,
            message,
            "messageColor": "#000000",
            "messageSize": 14,
            "backgroundColor": "#ffffff",
            "image": (imageFile == '') ? "" : fs.createReadStream(__dirname + '/' + imageFile),
            "imageWidth": 640
        }
    }

    // Fire off POST message to PiPup with 'request'
    tvIpAddresses.forEach((tvIpAddress) => {
        const options = {
            url: "http://" + tvIpAddress + ":7979/notify",
            ...optionsTemplate
        };

        request(options, function (err, res, body) {
            if (err) {
                console.log(`[ERROR] Error sending notification [${tvIpAddress}]: ${title} - ${message}`)
                console.log(err.message)
                process.exitCode = 1
            } else {
                console.log(`Sent notification successfully [${tvIpAddress}]: ${title} - ${message}`)
            }
            if (exitAfter) process.exit()
        })
    });
}

async function listLocationsAndCameras() {
    locations = await ringApi.getLocations().catch(error => {
        console.log('[ERROR] Unable to retrieve camera locations because: ' + error.message)
        process.exit(1) // exit with error code
    })
    intLocation = 0
    intCamera = 0

    locations.forEach(function (location) {
        intCamera = 0
        console.log(`Found location[${intLocation}]: ${location.name}`)

        // Subscribe to each camera at this location.
        location.cameras.forEach(function (camera) {
            console.log(`\t - Found ${camera.model} named ${camera.name}. Test with --test ${intLocation},${intCamera}`)
            intCamera++
        })
        intLocation++
    })

    process.exit()
}

/**
 * For testing: onnects to the first camera at first detected location, saves and sends a snapshot notification.
 * @param {*} intLocation Number of location to use in Location array.
 * @param {*} intCamera Number of camera to use in Location->Camera array.
 */
async function getTestSnapshot(intLocation = 0, intCamera = 0) {
    const locations = await ringApi.getLocations().catch(error => {
        console.log('[ERROR] Unable to retrieve camera locations because: ' + error.message)
        process.exit(1) // exit with error code
    })

    const location = locations[intLocation]
    const camera = location.cameras[intCamera]

    console.log(`Attempting to get snapshot for location #${intLocation}, camera #${intCamera}`)

    try {
        const snapshotBuffer = await camera.getSnapshot()
        console.log('Snapshot size: ' + Math.floor(snapshotBuffer.byteLength / 1024) + ' kb')

        fs.writeFile(__dirname + '/snapshot.png', snapshotBuffer, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;

            // success case, the file was saved
            console.log('Snapshot saved!')
            sendNotification('Test Snapshot', 'This is a test snapshot message!', 'snapshot.png', true)
        })
    } catch (e) {
        // failed to get a snapshot.  handle the error however you please
        console.log('Unable to get snapshot...')
        console.log(e)
        sendNotification('Test Snapshot Failed', 'An error occured trying to get a snapshot!', 'error.png', true)
    }
}

/**
 * Starts polling a Ring camera for events and grabs snapshots on motion/dings.
 * @param {*} notifyOnStart Whether to send a notification when beginning camera polling.
 */
async function startCameraPolling(notifyOnStart) {
    const locations = await ringApi.getLocations().catch(error => {
        console.log('Unable to retrieve camera locations because: ' + error.message)
        process.exit(1) // exit with error code
    })

    locations.forEach(function (location) {
        console.log(`Found location: ${location.name}`)

        // Subscribe to each camera at this location.
        location.cameras.forEach(function (camera) {
            console.log(`\t - Found ${camera.model} named ${camera.name}.`)

            // Start the camera subscription to listen for motion/rings/etc...
            camera.onNewDing.subscribe(async ding => {

                var event = "Unknown Event"
                var notifyTitle;
                var notifyMessage;

                // Get friendly name for event happening and set notification params.
                switch (ding.kind) {
                    case "motion":
                        event = "Motion detected"
                        notifyTitle = 'Motion Detected'
                        notifyMessage = `Motion detected at ${camera.name}!`
                        break
                    case "ding":
                        event = "Doorbell pressed"
                        notifyTitle = 'Doorbell Ring'
                        notifyMessage = `Doorbell rung at ${camera.name}!`
                        break
                    default:
                        event = `Video started (${ding.kind})`
                        notifyTitle = 'Video Started'
                        notifyMessage = `Video started at ${camera.name}`
                }

                console.log(`[${new Date()}] ${event} on ${camera.name} camera.`)

                // Grab new snapshot
                try {
                    const snapshotBuffer = await camera.getSnapshot().catch(error => {
                        console.log('[ERROR] Unable to retrieve snapshot because:' + error.message)
                    })

                    fs.writeFile(__dirname + '/snapshot.png', snapshotBuffer, (err) => {
                        // throws an error, you could also catch it here
                        if (err) throw err;

                        // success case, the file was saved
                        console.log('Snapshot saved!');
                        sendNotification(notifyTitle, notifyMessage, 'snapshot.png')
                    })
                } catch (e) {
                    // Failed to retrieve snapshot. We send text of notification along with error image.
                    // Most common errors are due to expired API token, or battery-powered camera taking too long to wake.
                    console.log('Unable to get snapshot.')
                    sendNotification(notifyTitle, notifyMessage, 'error.png')
                }

                console.log('')
            }, err => {
                console.log(`Error subscribing to ${location.name} ${camera.name}:`)
                console.log(err)
            },
                () => {
                    console.log('Subscription complete.') // We shouldn't get here!
                })

        })
    })

    // Send notification on app start, if enabled.
    if (notifyOnStart) sendNotification('ring-to-android-tv', 'Ring notifications started!', '')
}

// Set up Ring API object
ringApi = new Ring.RingApi({
    refreshToken: process.env.API_TOKEN,
    controlCenterDisplayName: 'ring-to-android-tv',
    cameraDingsPollingSeconds: 5    // Default is 5, less seems to cause API token to expire.
})

// Automatically replace refresh tokens, as they now expire after each use.
// See: https://github.com/dgreif/ring/wiki/Refresh-Tokens#refresh-token-expiration
ringApi.onRefreshTokenUpdated.subscribe(
    async ({ newRefreshToken, oldRefreshToken }) => {
        console.log('Refresh Token Updated') // Changed from example, don't write new token to log.

        if (!oldRefreshToken) {
            return
        }

        const currentConfig = await promisify(fs.readFile)('.env'),
            updatedConfig = currentConfig
                .toString()
                .replace(oldRefreshToken, newRefreshToken)

        await promisify(fs.writeFile)('.env', updatedConfig)
    }
)

if (process.argv.includes('--test')) {
    // Just grab a snapshot for testing, then exit.
    console.log('Attempting to get demo snapshot...')
    try {
        intArg = process.argv.indexOf('--test')
        var intLocation = intCamera = 0
        if (process.argv.length > intArg + 1) {
            // Attempt to get location,camera from next arg.
            strLocCam = process.argv[intArg + 1]
            intLocation = strLocCam.split(',')[0]
            intCamera = strLocCam.split(',')[1]
        }
        getTestSnapshot(intLocation, intCamera)
    } catch (e) {
        console.log('Error attempting to call getTestSnapshot().')
        console.log(e)
        process.exit()
    } finally {
        //process.exit()
    }
} else if (process.argv.includes('--list')) {
    listLocationsAndCameras()
} else {
    // Begin polling camera for events
    startCameraPolling(true)
}
