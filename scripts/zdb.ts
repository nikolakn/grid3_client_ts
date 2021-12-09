import { getClient } from "./client_loader";
import { ZdbModes, ZDBModel, ZDBSModel, ZDBDeleteModel } from "../src";
import { log } from "./utils";

// create zdb object
const zdb = new ZDBModel();
zdb.name = "hamada";
zdb.node_id = 16;
zdb.mode = ZdbModes.user;
zdb.disk_size = 9;
zdb.publicNamespace = false;
zdb.password = "testzdb";

// create zdbs object
const zdbs = new ZDBSModel();
zdbs.name = "tttzdbs";
zdbs.zdbs = [zdb];
zdbs.metadata = '{"test": "test"}';

async function main() {
    const grid3 = await getClient();
    try {
        // deploy zdb
        const res = await grid3.zdbs.deploy(zdbs);
        log(res);

        // get the deployment
        const l = await grid3.zdbs.getObj(zdbs.name);
        log(l);

        // // delete
        // const d = await grid3.zdbs.delete({ name: zdbs.name });
        // log(d);
    } catch (err) {
        console.log(err);
        process.exit(1);
    } finally {
        grid3.disconnect();
    }
}

main();
