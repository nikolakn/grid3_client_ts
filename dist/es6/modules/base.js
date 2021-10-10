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
import { HighLevelBase } from "../high_level/base";
import { TwinDeploymentHandler } from "../high_level/twinDeploymentHandler";
import { TwinDeployment, Operations } from "../high_level/models";
import { loadFromFile, updatejson, appPath } from "../helpers/jsonfs";
import { getNodeTwinId } from "../primitives/nodes";
import { DeploymentFactory } from "../primitives/deployment";
class BaseModule {
    constructor(twin_id, url, mnemonic, rmbClient) {
        this.twin_id = twin_id;
        this.url = url;
        this.mnemonic = mnemonic;
        this.rmbClient = rmbClient;
        this.fileName = "";
        this.deploymentFactory = new DeploymentFactory(twin_id, url, mnemonic);
        this.twinDeploymentHandler = new TwinDeploymentHandler(this.rmbClient, twin_id, url, mnemonic);
    }
    save(name, contracts, wgConfig = "", action = "add") {
        const path = PATH.join(appPath, this.fileName);
        const data = loadFromFile(path);
        let deploymentData = { contracts: [], wireguard_config: "" };
        if (Object.keys(data).includes(name)) {
            deploymentData = data[name];
        }
        for (const contract of contracts["created"]) {
            deploymentData.contracts.push({ contract_id: contract["contract_id"], node_id: contract["contract_type"]["nodeContract"]["node_id"] });
        }
        for (const contract of contracts["deleted"]) {
            deploymentData.contracts = deploymentData.contracts.filter(c => c["contract_id"] !== contract["contract_id"]);
        }
        if (action === "delete") {
            for (const contract of contracts["updated"]) {
                deploymentData.contracts = deploymentData.contracts.filter(c => c["contract_id"] !== contract["contract_id"]);
            }
        }
        if (wgConfig) {
            deploymentData["wireguard_config"] = wgConfig;
        }
        updatejson(path, name, deploymentData);
        return deploymentData;
    }
    _list() {
        const path = PATH.join(appPath, this.fileName);
        const data = loadFromFile(path);
        return Object.keys(data);
    }
    exists(name) {
        return this._list().includes(name);
    }
    _getDeploymentNodeIds(name) {
        const nodeIds = [];
        const contracts = this._getContracts(name);
        for (const contract of contracts) {
            nodeIds.push(contract["node_id"]);
        }
        return nodeIds;
    }
    _getContracts(name) {
        const path = PATH.join(appPath, this.fileName);
        const data = loadFromFile(path);
        if (!Object.keys(data).includes(name)) {
            return [];
        }
        return data[name]["contracts"];
    }
    _getContractIdFromNodeId(name, nodeId) {
        const contracts = this._getContracts(name);
        for (const contract of contracts) {
            if (contract["node_id"] === nodeId) {
                return contract["contract_id"];
            }
        }
    }
    _getNodeIdFromContractId(name, contractId) {
        const contracts = this._getContracts(name);
        for (const contract of contracts) {
            if (contract["contract_id"] === contractId) {
                return contract["node_id"];
            }
        }
    }
    _get(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = PATH.join(appPath, this.fileName);
            const data = loadFromFile(path);
            if (!Object.keys(data).includes(name)) {
                return [];
            }
            const deployments = [];
            for (const contract of data[name]["contracts"]) {
                const node_twin_id = yield getNodeTwinId(contract["node_id"]);
                const payload = JSON.stringify({ contract_id: contract["contract_id"] });
                const msg = this.rmbClient.prepare("zos.deployment.get", [node_twin_id], 0, 2);
                const messgae = yield this.rmbClient.send(msg, payload);
                const result = yield this.rmbClient.read(messgae);
                if (result[0].err) {
                    throw Error(String(result[0].err));
                }
                deployments.push(JSON.parse(String(result[0].dat)));
            }
            return deployments;
        });
    }
    _update(module, name, oldDeployments, twinDeployments, network = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let finalTwinDeployments = [];
            finalTwinDeployments = twinDeployments.filter(d => d.operation === Operations.update);
            twinDeployments = this.twinDeploymentHandler.deployMerge(twinDeployments);
            const deploymentNodeIds = this._getDeploymentNodeIds(name);
            finalTwinDeployments = finalTwinDeployments.concat(twinDeployments.filter(d => !deploymentNodeIds.includes(d.nodeId)));
            for (let oldDeployment of oldDeployments) {
                oldDeployment = this.deploymentFactory.fromObj(oldDeployment);
                const node_id = this._getNodeIdFromContractId(name, oldDeployment.contract_id);
                let deploymentFound = false;
                for (const twinDeployment of twinDeployments) {
                    if (twinDeployment.nodeId !== node_id) {
                        continue;
                    }
                    oldDeployment = yield this.deploymentFactory.UpdateDeployment(oldDeployment, twinDeployment.deployment, network);
                    deploymentFound = true;
                    if (!oldDeployment) {
                        continue;
                    }
                    finalTwinDeployments.push(new TwinDeployment(oldDeployment, Operations.update, 0, 0, network));
                    break;
                }
                if (!deploymentFound) {
                    const tDeployments = yield module.delete(oldDeployment, []);
                    finalTwinDeployments = finalTwinDeployments.concat(tDeployments);
                }
            }
            const contracts = yield this.twinDeploymentHandler.handle(finalTwinDeployments);
            if (contracts.created.length === 0 && contracts.updated.length === 0 && contracts.deleted.length === 0) {
                return "Nothing found to update";
            }
            this.save(name, contracts);
            return { contracts: contracts };
        });
    }
    _add(deployment_name, node_id, oldDeployments, twinDeployments, network = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalTwinDeployments = twinDeployments.filter(d => d.operation === Operations.update);
            const twinDeployment = twinDeployments.pop();
            const contract_id = this._getContractIdFromNodeId(deployment_name, node_id);
            if (contract_id) {
                for (let oldDeployment of oldDeployments) {
                    oldDeployment = this.deploymentFactory.fromObj(oldDeployment);
                    if (oldDeployment.contract_id !== contract_id) {
                        continue;
                    }
                    const newDeployment = this.deploymentFactory.fromObj(oldDeployment);
                    newDeployment.workloads = newDeployment.workloads.concat(twinDeployment.deployment.workloads);
                    const deployment = yield this.deploymentFactory.UpdateDeployment(oldDeployment, newDeployment, network);
                    twinDeployment.deployment = deployment;
                    twinDeployment.operation = Operations.update;
                    break;
                }
            }
            finalTwinDeployments.push(twinDeployment);
            const contracts = yield this.twinDeploymentHandler.handle(finalTwinDeployments);
            this.save(deployment_name, contracts);
            return { contracts: contracts };
        });
    }
    _deleteInstance(module, deployment_name, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const deployments = yield this._get(deployment_name);
            for (const deployment of deployments) {
                const twinDeployments = yield module.delete(deployment, [name]);
                const contracts = yield this.twinDeploymentHandler.handle(twinDeployments);
                if (contracts["deleted"].length > 0 || contracts["updated"].length > 0) {
                    this.save(deployment_name, contracts, "", "delete");
                    return contracts;
                }
            }
            throw Error(`instance with name ${name} is not found`);
        });
    }
    _delete(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = PATH.join(appPath, this.fileName);
            const data = loadFromFile(path);
            const contracts = { deleted: [], updated: [] };
            if (!Object.keys(data).includes(name)) {
                return contracts;
            }
            const deployments = yield this._get(name);
            const highlvl = new HighLevelBase(this.twin_id, this.url, this.mnemonic, this.rmbClient);
            for (const deployment of deployments) {
                const twinDeployments = yield highlvl._delete(deployment, []);
                const contract = yield this.twinDeploymentHandler.handle(twinDeployments);
                contracts.deleted = contracts.deleted.concat(contract["deleted"]);
                contracts.updated = contracts.updated.concat(contract["updated"]);
            }
            const deletedContracts = [];
            for (const c of contracts.deleted) {
                deletedContracts.push(c["contract_id"]);
            }
            const updatedContracts = [];
            for (const c of contracts.updated) {
                if (!deletedContracts.includes(c["contract_id"])) {
                    updatedContracts.push(c);
                }
            }
            contracts.updated = updatedContracts;
            updatejson(path, name, "", "delete");
            return contracts;
        });
    }
}
export { BaseModule };
