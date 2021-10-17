var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as PATH from "path";
import { Addr } from "netaddr";
import { WorkloadTypes } from "../zos/workload";
import { TwinDeployment, Operations } from "./models";
import { HighLevelBase } from "./base";
import { DiskPrimitive, VMPrimitive, IPv4Primitive, DeploymentFactory, getAccessNodes, } from "../primitives/index";
import { randomChoice } from "../helpers/utils";
import { events } from "../helpers/events";
import { QSFSPrimitive } from "../primitives/qsfs";
import { QSFSZdbsModule } from "../modules/qsfs_zdbs";
class VMHL extends HighLevelBase {
    create(name, nodeId, flist, cpu, memory, rootfs_size, disks, publicIp, planetary, network, entrypoint, env, metadata = "", description = "", qsfsDisks = [], qsfsProjectName = "") {
        return __awaiter(this, void 0, void 0, function* () {
            const deployments = [];
            const workloads = [];
            // disks
            const diskMounts = [];
            const disk = new DiskPrimitive();
            for (const d of disks) {
                workloads.push(disk.create(d.size, d.name, metadata, description));
                diskMounts.push(disk.createMount(d.name, d.mountpoint));
            }
            // qsfs disks
            const qsfsPrimitive = new QSFSPrimitive();
            for (const d of qsfsDisks) {
                // the ratio that will be used for minimal_shards is 2/5 and expected_shards 3/5
                const qsfsZdbsModule = new QSFSZdbsModule(this.twin_id, this.url, this.mnemonic, this.rmbClient);
                if (qsfsProjectName) {
                    qsfsZdbsModule.fileName = PATH.join(qsfsProjectName, qsfsZdbsModule.fileName);
                }
                const qsfsZdbs = yield qsfsZdbsModule.getZdbs(d.qsfs_zdbs_name);
                if (qsfsZdbs.groups.length === 0 || qsfsZdbs.meta.length === 0) {
                    throw Error(`Couldn't find a qsfs zdbs with name ${d.qsfs_zdbs_name}. Please create one with qsfs_zdbs module`);
                }
                const minimalShards = Math.ceil((qsfsZdbs.groups.length * 3) / 5);
                const expectedShards = qsfsZdbs.groups.length - minimalShards;
                const qsfsWorkload = qsfsPrimitive.create(d.name, minimalShards, expectedShards, d.prefix, qsfsZdbs.meta, qsfsZdbs.groups, d.encryption_key);
                workloads.push(qsfsWorkload);
                diskMounts.push(disk.createMount(d.name, d.mountpoint));
            }
            // ipv4
            let ipName = "";
            let publicIps = 0;
            if (publicIp) {
                const ipv4 = new IPv4Primitive();
                ipName = `${name}_pubip`;
                workloads.push(ipv4.create(ipName, metadata, description));
                publicIps++;
            }
            // network
            const deploymentFactory = new DeploymentFactory(this.twin_id, this.url, this.mnemonic);
            const accessNodes = yield getAccessNodes();
            let access_net_workload;
            let wgConfig = "";
            let hasAccessNode = false;
            for (const accessNode of Object.keys(accessNodes)) {
                if (network.nodeExists(Number(accessNode))) {
                    hasAccessNode = true;
                    break;
                }
            }
            if (!Object.keys(accessNodes).includes(nodeId.toString()) && !hasAccessNode) {
                // add node to any access node and deploy it
                const filteredAccessNodes = [];
                for (const accessNodeId of Object.keys(accessNodes)) {
                    if (accessNodes[accessNodeId]["ipv4"]) {
                        filteredAccessNodes.push(accessNodeId);
                    }
                }
                const access_node_id = Number(randomChoice(filteredAccessNodes));
                access_net_workload = yield network.addNode(access_node_id, metadata, description);
                wgConfig = yield network.addAccess(access_node_id, true);
            }
            const znet_workload = yield network.addNode(nodeId, metadata, description);
            if (znet_workload && network.exists()) {
                // update network
                for (const deployment of network.deployments) {
                    const d = deploymentFactory.fromObj(deployment);
                    for (const workload of d["workloads"]) {
                        if (workload["type"] !== WorkloadTypes.network ||
                            !Addr(network.ipRange).contains(Addr(workload["data"]["subnet"]))) {
                            continue;
                        }
                        workload.data = network.updateNetwork(workload["data"]);
                        workload.version += 1;
                        break;
                    }
                    deployments.push(new TwinDeployment(d, Operations.update, 0, 0, network));
                }
                workloads.push(znet_workload);
            }
            else if (znet_workload) {
                // node not exist on the network
                if (!access_net_workload && !hasAccessNode) {
                    // this node is access node, so add access point on it
                    wgConfig = yield network.addAccess(nodeId, true);
                    znet_workload["data"] = network.updateNetwork(znet_workload.data);
                }
                workloads.push(znet_workload);
            }
            if (access_net_workload) {
                // network is not exist, and the node provide is not an access node
                const accessNodeId = access_net_workload.data["node_id"];
                access_net_workload["data"] = network.updateNetwork(access_net_workload.data);
                const deployment = deploymentFactory.create([access_net_workload], 1626394539, metadata, description);
                deployments.push(new TwinDeployment(deployment, Operations.deploy, 0, accessNodeId, network));
            }
            // vm
            const vm = new VMPrimitive();
            const machine_ip = network.getFreeIP(nodeId);
            events.emit("logs", `Creating a vm on node: ${nodeId}, network: ${network.name} with private ip: ${machine_ip}`);
            workloads.push(vm.create(name, flist, cpu, memory, rootfs_size, diskMounts, network.name, machine_ip, planetary, ipName, entrypoint, env, metadata, description));
            // deployment
            // NOTE: expiration is not used for zos deployment
            const deployment = deploymentFactory.create(workloads, 1626394539, metadata, description);
            deployments.push(new TwinDeployment(deployment, Operations.deploy, publicIps, nodeId, network));
            return [deployments, wgConfig];
        });
    }
    delete(deployment, names) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._delete(deployment, names, [
                WorkloadTypes.ipv4,
                WorkloadTypes.zmount,
                WorkloadTypes.zmachine,
            ]);
        });
    }
}
export { VMHL };
