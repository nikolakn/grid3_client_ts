"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeIdFromContractId = exports.getAccessNodes = exports.getNodeTwinId = void 0;
const ip_1 = __importDefault(require("ip"));
const client_1 = require("../tf-grid/client");
const requests_1 = require("../helpers/requests");
const graphqlURL = "https://tfchain.dev.threefold.io/graphql/graphql";
async function getNodeTwinId(node_id) {
    const headers = { "Content-Type": "application/json" };
    const body = `{
            nodes(where: { nodeId_eq: ${node_id} }) {
            twinId
            }
        }`;
    const response = await requests_1.send("post", graphqlURL, JSON.stringify({ query: body }), headers);
    const res = JSON.parse(response);
    return res["data"]["nodes"][0]["twinId"];
}
exports.getNodeTwinId = getNodeTwinId;
async function getAccessNodes() {
    const headers = { "Content-Type": "application/json" };
    let body = `{
        nodes {
          nodeId
          publicConfigId 
        }
      }`;
    const nodeResponse = await requests_1.send("post", graphqlURL, JSON.stringify({ query: body }), headers);
    const nodeRes = JSON.parse(nodeResponse);
    const nodes = nodeRes["data"]["nodes"];
    const nodeConfigs = {};
    let configsIds = "";
    for (const node of nodes) {
        if (!node.publicConfigId) {
            continue;
        }
        nodeConfigs[node.nodeId] = node.publicConfigId;
        configsIds += `"${node.publicConfigId}", `;
    }
    body = `{
        publicConfigs (where: {id_in: [${configsIds}]}) {
          id
          ipv4
          ipv6    
        }
      }`;
    const pubConfigResponse = await requests_1.send("post", graphqlURL, JSON.stringify({ query: body }), headers);
    const pubConfigRes = JSON.parse(pubConfigResponse);
    const configs = pubConfigRes["data"]["publicConfigs"];
    const accessNodes = {};
    for (const nodeId of Object.keys(nodeConfigs)) {
        const config = nodeConfigs[nodeId];
        for (const conf of configs) {
            if (config === conf["id"]) {
                const ipv4 = conf["ipv4"];
                const ipv6 = conf["ipv6"];
                if ((ip_1.default.isV4Format(ipv4.split("/")[0]) && !ip_1.default.isPrivate(ipv4)) ||
                    (ip_1.default.isV6Format(ipv6.split("/")[0]) && !ip_1.default.isPrivate(ipv6))) {
                    accessNodes[nodeId] = { ipv4: ipv4, ipv6: ipv6 };
                }
            }
        }
    }
    console.log(accessNodes);
    return accessNodes;
}
exports.getAccessNodes = getAccessNodes;
async function getNodeIdFromContractId(contractId, url, mnemonic) {
    const tfclient = new client_1.TFClient(url, mnemonic);
    await tfclient.connect();
    let nodeId;
    try {
        const contract = await tfclient.contracts.get(contractId);
        nodeId = contract["node_id"];
    }
    catch (err) {
        throw Error(err);
    }
    finally {
        tfclient.disconnect();
    }
    return nodeId;
}
exports.getNodeIdFromContractId = getNodeIdFromContractId;
