import { createInfra } from "../infra/index.ts";
import { createServices } from "../services/index.ts";
import { createUsecases } from "../usecases/index.ts";
import { printHelp } from "./help.ts";
import { createTuiCommand } from "./tui-command.ts";
import { createNewCommand } from "./new-command.ts";
import { createOpenCommand } from "./open-command.ts";
import { createKillCommand } from "./kill-command.ts";
import { createListCommand } from "./list-command.ts";

const main = async (): Promise<void> => {
  const infra = createInfra();
  const services = createServices({ infra });
  const usecases = createUsecases({ services, infra });

  const [command, ...args] = process.argv.slice(2);

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const commands: Record<string, (args: string[]) => Promise<void>> = {
    new: createNewCommand({ usecases }),
    open: createOpenCommand({ infra }),
    kill: createKillCommand({ usecases }),
    list: createListCommand({ usecases }),
  };

  const handler = commands[command ?? ""];

  if (command && !handler) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  if (handler) {
    await handler(args);
    return;
  }

  await createTuiCommand({ usecases, services, infra })();
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
