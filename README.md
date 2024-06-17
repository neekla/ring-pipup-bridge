# ring-to-android-tv

A `nodejs` application that acts as a bridge between `ring-client-api` and the [PiPup Android application](https://github.com/rogro82/pipup) in order to view Ring Doorbell camera events on Android TVs like the Nvidia SHIELD.

![](https://raw.githubusercontent.com/stevenflesch/ring-to-android-tv/master/extras/sample-tv-shot.jpg)

## Updates

 ### Update - July 01, 2021

 - I no longer have access to a Ring device, so this project will not receive updates in the future.  If you wish to maintain this project, please open an issue.  Thank you!

 ### v2.0.0 - Oct 01, 2020

 - **BREAKING CHANGES**: Use of `token.txt` and script variables are deprecated.  These values are now stored in a .env file.  See `.env.example` for an example.

## Requirements

- Android TV
- `nodejs` Server (a Raspberry Pi works fine)
- Ring API Token for 2FA Bypass (instructions below)

## Setup

1. Install [PiPup](https://github.com/rogro82/pipup) on your Android TV.  Follow instructions on the PiPup page to gain access to the public beta.
2. Use ADB Shell to grant overlay permissions - see instructions below in *ADB Shell over Network* section.
	>`adb shell appops set nl.rogro82.pipup SYSTEM_ALERT_WINDOW allow`

	>*Note: if using the Remote ADB Shell app, you must omit `adb shell`*
3. Install `node` and `git` on your server, if not already.
4. Clone the `ring-to-android-tv` repo.
	> `git clone https://github.com/stevenflesch/ring-to-android-tv.git`
5. Run `npm install` in the `ring-to-android-tv` folder.
	> `cd ring-to-android-tv`

	> `npm install`
6. Copy the .env.example file to .env to configure your installation.
	> `cp .env.example .env`
7. Open `.env` in your editor and replace the `IP_ADDRESSES` variable with the IP address(es) of your Android TV(s).
8. Generate an API token and save it to `.env`.  Copy the key value only, no quotes.  *Note: keep this secret, as it allows complete access to your Ring account.*
	> `npx -p ring-client-api ring-auth-cli`

	> *Save token to `.env` line like so:*

	> `API_TOKEN=`**MYAPITOKEN**
9. Test the script using `--test` flag.
	> `node app.js --test`

	>*Note: If you want to test a different camera, you can use a different camera by specifying a location,camera like `--test 0,0`.  List your locations by typing `node app.js --list`.*
10. Run the application!
	> `node app.js`
11. *Optional:* Install the app as a service with instructions below.

#### ADB Shell over Network

If you'd like to execute the adb shell command with your Android phone, you can do so with a free app called [Remote ADB Shell](https://play.google.com/store/apps/details?id=com.cgutman.androidremotedebugger&hl=en_US).  Follow these instructions to do so:

1. On your Android TV, open **Settings**.
2. Open **Device Preferences -> About**.
3. Scroll down to **Build** and click on it several times rapidly to enable Developer Mode.
4. Press back button, scroll down to **Developer options**.
5. Scroll down and enable **Network debugging**.
6. Open Remote ADB Shell on your phone.
7. Connect to your Android TV.
8. Execute the following command: **`appops set nl.rogro82.pipup SYSTEM_ALERT_WINDOW allow`**
9. You can now disable **Network debugging** if you desire, for security purposes.

## Run as a Service

In order to run `ring-to-android-tv` as a service, you'll need to install the `forever` and `forever-service` npm packages and edit your crontab to run the script at startup.  Follow the directions below.

1. Install [forever.js](https://github.com/foreversd/forever) and [forever-service.js](https://github.com/zapty/forever-service).  In this example, we are installing it globally, which requires root priviledges.
	> `sudo npm install forever forever-service -g`
2. Navigate to script directory.
	> `cd ring-to-android-tv/`
3. Install service with provided JSON configuration.
	> `sudo forever-service install ring-to-android-tv`
4. *Note: you can check that the script is running by entering: `sudo service ring-to-android-tv status`

## Updating the Script

To update the script, simply `cd` to the app directory and run `git pull`.
> `cd ring-to-android-tv/ && git pull`

## Configuration

| Option | Explanation |
|:----------|:----------|
| `IP_ADDRESSES` | *Comma separated IP addresses of the Android TVs running PiPup.  Required.* |
| `DISPLAY_TIME` | *Time, in seconds, to display popup notifications.* |
| `API_TOKEN` | *API Token used from Ring* |

## License & Contributions

### License

This application is released under an MIT license.

### Contributions

Please submit contributions with a pull request, they are very welcome!

## Acknowledgements

A huge thank you to both [rogro82](https://github.com/rogro82) for the PiPup application and [dgreif](https://github.com/dgreif) for the `ring-client-api` library.
