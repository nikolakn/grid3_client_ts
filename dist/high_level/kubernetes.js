var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WorkloadTypes } from "../zos/workload";
import { VirtualMachine } from "../high_level//machine";
import { HighLevelBase } from "./base";
const Flist = "https://hub.grid.tf/ahmed_hanafy_1/ahmedhanafy725-k3s-latest.flist";
class Kubernetes extends HighLevelBase {
    add_master(name, nodeId, secret, cpu, memory, diskSize, publicIp, network, sshKey, metadata = "", description = "") {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Creating a master with name: ${name} on node: ${nodeId}, network: ${network.name}`);
            const machine = new VirtualMachine(this.twin_id, this.url, this.mnemonic, this.rmbClient);
            const mountpoint = "/mnt/data";
            const env = {
                SSH_KEY: sshKey,
                K3S_TOKEN: secret,
                K3S_DATA_DIR: mountpoint,
                K3S_FLANNEL_IFACE: "eth0",
                K3S_NODE_NAME: name,
                K3S_URL: "",
            };
            const disk = {
                name: `${name}_disk`,
                size: diskSize,
                mountpoint: mountpoint,
            };
            return yield machine.create(name, nodeId, Flist, cpu, memory, [disk], publicIp, network, "/sbin/zinit init", env, metadata, description);
        });
    }
    add_worker(name, nodeId, secret, masterIp, cpu, memory, diskSize, publicIp, network, sshKey, metadata = "", description = "") {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Creating a worker with name: ${name} on node: ${nodeId}, network: ${network.name}`);
            const machine = new VirtualMachine(this.twin_id, this.url, this.mnemonic, this.rmbClient);
            const mountpoint = "/mnt/data";
            const env = {
                SSH_KEY: sshKey,
                K3S_TOKEN: secret,
                K3S_DATA_DIR: mountpoint,
                K3S_FLANNEL_IFACE: "eth0",
                K3S_NODE_NAME: name,
                K3S_URL: `https://${masterIp}:6443`,
            };
            const disk = {
                name: `${name}_disk`,
                size: diskSize,
                mountpoint: mountpoint,
            };
            return yield machine.create(name, nodeId, Flist, cpu, memory, [disk], publicIp, network, "/sbin/zinit init", env, metadata, description);
        });
    }
    delete(deployment, names) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._delete(deployment, names, [
                WorkloadTypes.zmachine,
                WorkloadTypes.zmount,
                WorkloadTypes.ipv4,
            ]);
        });
    }
}
export { Kubernetes };
