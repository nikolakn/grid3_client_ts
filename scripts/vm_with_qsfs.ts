import { MachinesModel, QSFSZDBSModel } from "../src";
import { config, getClient } from "./client_loader";
import { log } from "./utils";

const qsfs_name = "wed2710q1";
const machines_name = "wed2710t1";

const qsfs: QSFSZDBSModel = {
    name: qsfs_name,
    count: 8,
    node_ids: [16, 17],
    password: "mypassword",
    disk_size: 10,
    description: "my qsfs test",
    metadata: "",
};

const vms: MachinesModel = {
    name: machines_name,
    network: {
        name: "wed2710n1",
        ip_range: "10.201.0.0/16",
    },
    machines: [
        {
            name: "wed2710v1",
            node_id: 17,
            disks: [
                {
                    name: "wed2710d1",
                    size: 10,
                    mountpoint: "/mydisk",
                },
            ],
            qsfs_disks: [
                {
                    qsfs_zdbs_name: qsfs_name,
                    name: "wed2710d2",
                    minimal_shards: 2,
                    expected_shards: 4,
                    encryption_key: "hamada",
                    prefix: "hamada",
                    cache: 1,
                    mountpoint: "/myqsfsdisk",
                },
            ],
            public_ip: false,
            public_ip6: false,
            planetary: true,
            cpu: 1,
            memory: 1024 * 2,
            rootfs_size: 0,
            flist: "https://hub.grid.tf/tf-official-apps/base:latest.flist",
            entrypoint: "/sbin/zinit init",
            env: {
                SSH_KEY: config.ssh_key,
            },
        },
    ],
    metadata: "{'testVMs': true}",
    description: "test deploying VMs via ts grid3 client",
};

async function cancel(grid3) {
    // delete
    const d = await grid3.machines.delete({ name: machines_name });
    log(d);
    const r = await grid3.qsfs_zdbs.delete({ name: qsfs_name });
    log(r);
}

async function main() {
    const grid3 = await getClient();

    //deploy qsfs
    const res = await grid3.qsfs_zdbs.deploy(qsfs);
    log(">>>>>>>>>>>>>>>QSFS backend has been created<<<<<<<<<<<<<<<");
    log(res);

    const vm_res = await grid3.machines.deploy(vms);
    log(">>>>>>>>>>>>>>>vm has been created<<<<<<<<<<<<<<<");
    log(vm_res);

    // get the deployment
    const l = await grid3.machines.getObj(vms.name);
    log(">>>>>>>>>>>>>>>Deployment result<<<<<<<<<<<<<<<");
    log(l);

    // await cancel(grid3);

    await grid3.disconnect();
}

main();
