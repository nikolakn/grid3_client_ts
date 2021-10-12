import { Zmachine, ZNetworkInterface, ZmachineNetwork } from "../zos/zmachine";
import { WorkloadTypes, Workload } from "../zos/workload";
import { ComputeCapacity } from "../zos/computecapacity";
class VMPrimitive {
    _createComputeCapacity(cpu, memory) {
        const compute_capacity = new ComputeCapacity();
        compute_capacity.cpu = cpu;
        compute_capacity.memory = 1024 * 1024 * memory;
        return compute_capacity;
    }
    _createNetworkInterface(networkName, ip) {
        const znetwork_interface = new ZNetworkInterface();
        znetwork_interface.network = networkName;
        znetwork_interface.ip = ip;
        return znetwork_interface;
    }
    _createMachineNetwork(networkName, ip, planetary, public_ip = "") {
        const zmachine_network = new ZmachineNetwork();
        zmachine_network.planetary = planetary;
        zmachine_network.interfaces = [this._createNetworkInterface(networkName, ip)];
        zmachine_network.public_ip = public_ip;
        return zmachine_network;
    }
    create(name, flist, cpu, memory, rootfs_size, disks, networkName, ip, planetary, public_ip, entrypoint, env, metadata = "", description = "", version = 0) {
        const zmachine = new Zmachine();
        zmachine.flist = flist;
        zmachine.network = this._createMachineNetwork(networkName, ip, planetary, public_ip);
        zmachine.size = rootfs_size * 1024 * 1024 * 1024;
        zmachine.mounts = disks;
        zmachine.entrypoint = entrypoint;
        zmachine.compute_capacity = this._createComputeCapacity(cpu, memory);
        zmachine.env = env;
        const zmachine_workload = new Workload();
        zmachine_workload.version = version || 0;
        zmachine_workload.name = name;
        zmachine_workload.type = WorkloadTypes.zmachine;
        zmachine_workload.data = zmachine;
        zmachine_workload.metadata = metadata;
        zmachine_workload.description = description;
        return zmachine_workload;
    }
}
export { VMPrimitive };
