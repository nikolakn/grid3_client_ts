import fs from "fs";
import path from "path";
import { argv, env } from "process";
import { MessageBusClientInterface } from "ts-rmb-client-base";
import { HTTPMessageBusClient } from "ts-rmb-http-client";
import { MessageBusClient } from "ts-rmb-redis-client";

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "./config.json"), "utf-8"));

function getRmbProxy(): string {
    let rmb_proxy = "";
    // Check for rmb proxy value from arguments
    argv.forEach((val, ind, arr) => {
        if (val == "--proxy" || val == "-p") {
            rmb_proxy = arr[ind + 1];
        }
    });

    if (rmb_proxy) {
        return rmb_proxy;
    }

    // Check for rmb proxy value from config
    if (config.rmb_proxy) {
        return config.rmb_proxy;
    }

    // Check for rmb proxy value from env
    if (env.RMB_PROXY) {
        return env.RMB_PROXY;
    }
    return rmb_proxy;
}

// MsgBusClientInterface
function getRMBClient(): MessageBusClientInterface {
    const rmb_proxy = getRmbProxy();
    if (rmb_proxy) {
        return new HTTPMessageBusClient(0, rmb_proxy);
    } else {
        return new MessageBusClient();
    }
}

export { getRMBClient };
