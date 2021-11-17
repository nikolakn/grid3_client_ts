import "reflect-metadata";

import { GatewayNameModel, GatewayNameDeleteModel } from "../../src/modules/models";
import { getClient } from "../client_loader";

const gw = new GatewayNameModel();
gw.name = "peertube3";
gw.node_id = 1;
gw.tls_passthrough = false;
gw.backends = ["http://[300:9fab:2cda:749d:e08b:5905:604a:f7cb]:3000/"];

async function main() {
    const grid3 = await getClient();

    const cmd = process.argv[2];

    cmd === "deploy"
        ? await deploy(grid3)
        : cmd == "get"
        ? await get(grid3)
        : cmd == "destroy"
        ? await destroy(grid3)
        : console.log("Enter a useful command");

    grid3.disconnect();
}

main();

async function deploy(grid3) {
    const res = await grid3.gateway.deploy_name(gw);
    console.log(JSON.stringify(res));

    await get(grid3);
}

async function get(grid3) {
    const l = await grid3.gateway.getObj(gw.name);
    console.log(JSON.stringify(l));
}

async function destroy(grid3) {
    const m = new GatewayNameDeleteModel();
    m.name = gw.name;
    const d = await grid3.gateway.delete_name(m);
    console.log(d);
}
