import { TelegramBot } from "./bot/bot";
import { Server } from "./server/server";
import { env } from "./config/env";
import { Database } from "./config/database";
import { InvoiceMonitorService } from "./services/invoiceMonitor.service";

export class App {
  public readonly bot: TelegramBot;
  public readonly server: Server;
  public readonly invoiceMonitor: InvoiceMonitorService;

  constructor() {
    this.bot = new TelegramBot(env.TG_BOT_TOKEN, this);
    this.server = new Server(this);
    this.invoiceMonitor = new InvoiceMonitorService(this);
  }

  public async start() {
    await Database.connect();

    this.bot.start();
    this.server.start();
    this.invoiceMonitor.startMonitoring();

    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());

    console.log("App: started");
  }

  public async stop() {
    await Database.disconnect();
    process.exit(0);
  }
}
