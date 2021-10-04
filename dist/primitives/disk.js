"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Disk = void 0;
const workload_1 = require("../zos/workload");
const zmount_1 = require("../zos/zmount");
const zmachine_1 = require("../zos/zmachine");
class Disk {
    createMount(name, mountpoint) {
        const mount = new zmachine_1.Mount();
        mount.name = name;
        mount.mountpoint = mountpoint;
        return mount;
    }
    create(size, name, metadata = "", description = "", version = 0) {
        const zmount = new zmount_1.Zmount();
        zmount.size = 1024 * 1024 * 1024 * size;
        const zmount_workload = new workload_1.Workload();
        zmount_workload.version = version;
        zmount_workload.name = name;
        zmount_workload.type = workload_1.WorkloadTypes.zmount;
        zmount_workload.data = zmount;
        zmount_workload.metadata = metadata;
        zmount_workload.description = description;
        return zmount_workload;
    }
    update(size, name, metadata = "", description = "", old_version = 1) {
        return this.create(size, name, metadata, description, old_version + 1);
    }
}
exports.Disk = Disk;
