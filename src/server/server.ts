import bodyParser from 'body-parser';
import { WebhookClient } from 'discord.js';
import express = require('express');
import { Server } from 'http';
import { resolve as resolvePath } from 'path';
import io from 'socket.io';

import { AzureBot } from './azure-bot';
import * as config from './config';
import { DiscordBot } from './discord-bot';
import { log } from './log';
import { Overlay } from './overlay';
import { changeLightColor, sendLightEffect } from './routes/lights';
import { saveCssRoute } from './routes/save-css';
import { scenesRoute } from './routes/scenes';
import { resolve } from 'dns';

/**
 * The base Express Application. This is where most of the other parts of the application
 * will live. This allows for easy enabling and disabling of features within the application
 */
export class AppServer {
  public overlay!: Overlay;
  public azureBot!: AzureBot;
  public app: express.Application;
  public io!: SocketIO.Server;
  public discordHook!: WebhookClient;
  private http!: Server;

  constructor() {
    this.app = express();
    this.configApp();
    this.startDiscordHook();
    this.startOverlay();
    this.defineRoutes();
    this.startAzureBot();
    this.listen();
  }

  /**
   * Return the Express Application
   */
  public getApp = (): express.Application => this.app;

  /**
   * Create the Overylay
   */
  private startOverlay = () => {
    this.http = new Server(this.app);
    this.overlay = new Overlay();
    this.io = io(this.http);
  };

  /**
   * Create the AzureBot
   */
  private startAzureBot = () => {
    if (config.azureBotEnabled) {
      this.azureBot = new AzureBot();
      this.azureBot.createNewBotConversation();
    }
  };

  /**
   * Start the Discord Hook
   */
  private startDiscordHook = () => {
    if (config.discordHookEnabled) {
      this.discordHook = new DiscordBot().createDiscordHook();
    }
  };

  /**
   * Config Express
   */
  private configApp(): void {
    this.app.use(bodyParser.json());
    this.app.set('view engine', 'pug');
    this.app.set('views', resolvePath(`${__dirname}`, '../views'));
    this.app.use(express.static(resolvePath(`${__dirname}`, '../')));
  }

  /**
   * Define the routes used in the application
   */
  private defineRoutes(): void {
    const router: express.Router = express.Router();
    router.get('/scenes', scenesRoute);

    router.post('/save', saveCssRoute);

    router.get('/overlay-colors', (req, res) => {
      res.render('overlay-colors');
    });

    router.get('/lights/:color', changeLightColor);
    router.get('/lights/effects/:effect', sendLightEffect);

    router.get('/bulb/color', (req, res) => {
      let currentColor: string;
      if (this.overlay) {
        currentColor = this.overlay.getCurrentColor();
      } else {
        currentColor = 'blue';
      }
      res.json({ color: currentColor });
    });

    this.app.use('/', router);
  }

  /**
   * Start the server
   */
  private listen = (): void => {
    const runningMessage = `Overlay server is running on port http://localhost:${
      config.port
    }`;
    this.http.listen(config.port, () => {
      log('info', runningMessage);
    });
  };
}
