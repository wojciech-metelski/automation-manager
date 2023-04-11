import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';

import getSnapshots from '@salesforce/apex/AutomationsManagerSnapshotController.getSnapshots';
import createSnapshot from '@salesforce/apex/AutomationsManagerSnapshotController.createSnapshot';

import getTriggers from '@salesforce/apex/AutomationsManagerController.getTriggers';
import getFlows from '@salesforce/apex/AutomationsManagerController.getFlows';
import getProcessBuilders from '@salesforce/apex/AutomationsManagerController.getProcessBuilders';
import getWorkflowBatch from '@salesforce/apex/AutomationsManagerController.getWorkflowBatch';
import getWorkflowIds from '@salesforce/apex/AutomationsManagerController.getWorkflowIds';
import getValidationRuleBatch from '@salesforce/apex/AutomationsManagerController.getValidationRuleBatch';
import getValidationRuleIds from '@salesforce/apex/AutomationsManagerController.getValidationRuleIds';

import toggleFlows from '@salesforce/apex/AutomationsManagerController.toggleFlows';
import toggleWorkflows from '@salesforce/apex/AutomationsManagerController.toggleWorkflows';
import toggleValidationRules from '@salesforce/apex/AutomationsManagerController.toggleValidationRules';

import deployData from '@salesforce/apex/AutomationsManagerMetadataService.deployData';
import checkDeploymentStatus from '@salesforce/apex/AutomationsManagerMetadataService.checkDeploymentStatus';

import JSZIP from '@salesforce/resourceUrl/jszip';

export default class AutomationsManager extends LightningElement {
    isLoading = false;
    editingEnabled = true;

    errors = {};

    get isSnapshotListDisabled(){
        return !this.snapshots.length;
    }
    
    get isSaveSnapshotButtonDisabled(){
        return !this.editingEnabled;
    }

    get isClearSnapshotButtonDisabled(){
        return !this.template.querySelector('[data-snapshot]')?.value;
    }

    AUTOMATION_TYPES = ['triggers', 'flows', 'processBuilders', 'workflows', 'validationRules'];
    @track
    automations = [];

    selectedSnapshot;
    @track snapshots = [];
    get snapshotOptions(){
        return this.snapshots.map((item) => {
            //console.log(JSON.stringify(item));
            const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'medium'});
            const date = new Date(item.createdDate).getTime();
            //const name = item.queryName || 'No Value';
            //const objectName = item.queryObjectName || 'No Value';
            return {
                label: `${item.name}`,
                description: `${formatter.format(date)}`,
                value: item.id,
            };
        })
    }

    @track triggers = {
        title: 'Triggers',
        records: [],
        draftValues: [],
        get table(){
            return this.records.map(item => {
                item['triggerUrl'] = '/lightning/setup/ApexTriggers/page?address=%2F' + item.id;
                return item;
            })
        }
    }

    @track flows = {
        title: 'Flows',
        records: [],
        draftValues: [],
        get table(){
            return this.records.map(item => {
                item['flowUrl'] = '/builder_platform_interaction/flowBuilder.app?flowId=' + item.activeVersionId;
                item['urlLabel'] = item.activeVersionId ? item.activeVersionId : 'Inactive';
                item['urlStyle'] = item.activeVersionId ? '' : 'disabled';
                return item;
            });
        }
    }

    @track workflows = {
        title: 'Workflow Rules',
        records: [],
        draftValues: [],
        get table(){
            return this.records.map(item => {
                item['workflowUrl'] = '/' + item.id
                return item;
            })
        }
    }

    @track processBuilders = {
        title: 'Processes',
        records: [],
        draftValues: [],
        get table(){
            return this.records.map(item => {
                item['versionLabel'] = item.activeVersionId ? item.activeVersionId : 'Inactive';
                return item;
            })
        }
    }

    @track validationRules = {
        title: 'Validation Rules',
        records: [],
        draftValues: [],
        get table(){
            return this.records.map(item => {
                item['validationRuleUrl'] = '/' + item.id
                return item;
            })
        }
    }

    zipper;
    name = '';
    objectName = '';

    actions = [
        { label: 'Select All', name: 'selectAll' },
        { label: 'Clear All', name: 'clearAll' },
    ]

    
    get triggersColumns() {
        return [
            { label: 'Is Active', fieldName: 'isActive', type: 'boolean', editable: this.editingEnabled, actions: this.actions},
            { label: 'Id', fieldName: 'triggerUrl', type: 'url', typeAttributes: {
                label: {fieldName: 'id'},
                target: '_blank', }
            },
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    get flowsColumns() {
        return [
            { label: 'Is Active', fieldName: 'isActive', type: 'boolean', editable: this.editingEnabled, actions: this.actions},
            { label: 'Active Version Id', fieldName: 'flowUrl', type: 'url', 
                typeAttributes: {label: { fieldName: 'urlLabel'}, target: '_blank'},
                cellAttributes: {class: { fieldName: 'urlStyle'}}
            },
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    get processBuildersColumns() {
        return [
            { label: 'Is Active', fieldName: 'isActive', type: 'boolean', editable: this.editingEnabled, actions: this.actions},
            { label: 'Active Version Id', fieldName: 'versionLabel'},
            { label: 'Name', fieldName: 'name'},
            // { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    get workflowsColumns() {
        return [
            { label: 'Is Active', fieldName: 'isActive', type: 'boolean', editable: this.editingEnabled, actions: this.actions},
            { label: 'Id', fieldName: 'workflowUrl', type: 'url', typeAttributes: {"label": {"fieldName": "id"},"target": "_blank"} },
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    get validationRulesColumns() {
        return [
            { label: 'Is Active', fieldName: 'isActive', type: 'boolean', editable: this.editingEnabled, actions: this.actions},
            { label: 'Id', fieldName: 'validationRuleUrl', type: 'url', typeAttributes: {"label": {"fieldName": "id"},"target": "_blank"} },
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    handleHeaderAction(e, type){
        const actionName = e.detail.action.name;
        this[type].draftValues = [];
        
        if(actionName === 'selectAll'){
            this.template.querySelector('[data-snapshot]').value = null;
            for(let item of this[type].records){
                this[type].draftValues.push({id: item.id, isActive: true});
            }
        }

        if(actionName === 'clearAll'){
            this.template.querySelector('[data-snapshot]').value = null;
            for(let item of this[type].records){
                this[type].draftValues.push({id: item.id, isActive: false});
            }
        }
    }

    showToast(title, message, variant='info') {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    parseWorkflows(data){
        data = JSON.parse(data);
        const workflows = [];
        for(let item of data.compositeResponse){
            const body = item.body;
            const workflow = {};
            workflow.id = body.Id;
            workflow.isActive = body.Metadata.active;
            workflow.metadata = body.Metadata;
            workflow.relatedObject = body.TableEnumOrId;
            workflow.name = body.Name;
            workflows.push(workflow);
        }

        return workflows;
    }

    parseValidationRules(data){
        data = JSON.parse(data);
        const validationRules = [];
        for(let item of data.compositeResponse){
            const body = item.body;
            const validationRule = {};
            validationRule.id = body.Id;
            validationRule.isActive = body.Metadata.active;
            validationRule.metadata = body.Metadata;
            validationRule.relatedObject = body.EntityDefinition.FullName;
            validationRule.name = body.ValidationName;
            validationRules.push(validationRule);
        }

        return validationRules;
    }

    chunk(arr){
        const chunks = [];
        const chunkSize = 25;
        for (let i = 0; i < arr.length; i += chunkSize) {
            chunks.push(arr.slice(i, i + chunkSize));
        }

        return chunks;
    }

    async getWorkflows(payload){
        try{
            const workflowIds = await getWorkflowIds(payload);
            const chunkedIds = this.chunk(workflowIds);
            const workflowBatches = chunkedIds.map(chunk => getWorkflowBatch({workflowIds: chunk}))
            let workflows = await Promise.all(workflowBatches);
            workflows = workflows.map(item => this.parseWorkflows(item));
            return [].concat(...workflows);
        }catch(e){
            throw new Error(`Failed Fetching Workflows: ${JSON.stringify(e)}`);
        } 
    }

    async getValidationRules(payload){
        try{
            const validationRuleIds = await getValidationRuleIds(payload);
            const chunkedIds = this.chunk(validationRuleIds);
            const validationRuleBatches = chunkedIds.map(chunk => getValidationRuleBatch({validationRuleIds: chunk}));
            let validationRules = await Promise.all(validationRuleBatches);
            validationRules = validationRules.map(item => this.parseValidationRules(item));
            return [].concat(...validationRules);
        }catch(e){
            throw new Error(`Failed Fetching Validation Rules: ${JSON.stringify(e)}`);
        } 
    }

    async getAutomations(){
        this.isLoading = true;
        const payload = {
            name: this.name,
            objectName: this.objectName
        };

        try{
            let [triggers, flows, processBuilders, workflows, validationRules] = await Promise.all([
                getTriggers(payload),
                getFlows(payload),
                getProcessBuilders(payload),
                this.getWorkflows(payload),
                this.getValidationRules(payload)
            ]);

            this.triggers.records = triggers;
            this.flows.records = flows;
            this.processBuilders.records = processBuilders;
            this.workflows.records = workflows;
            this.validationRules.records = validationRules;
        }catch(e){
            console.error(e.message || e.body.message || JSON.stringify(e));
            this.showToast('Error', e.message, 'error');
        }
        finally{
            this.isLoading = false;
        }
    }

    showErrors(responses, type){
        const errors = {};
        for(const batch of responses){
            const data = JSON.parse(batch);
            for(const item of data.compositeResponse){
                if(item.httpStatusCode < 200 || item.httpStatusCode >= 300){
                    errors[item.referenceId] = {
                        title: item.httpStatusCode,
                        messages: JSON.stringify(item.body)
                    }
                }
            }
        }

        this[type].errors = {
            rows: errors
        }
    }

    getTriggerMetadata(apiVersion=56.0, status='Active'){
        return `<?xml version="1.0" encoding="UTF-8"?>
            <ApexTrigger xmlns="http://soap.sforce.com/2006/04/metadata">
                <apiVersion>${apiVersion}</apiVersion>
                <status>${status}</status>
            </ApexTrigger>`;
    }

    getTriggerPackageXML(name, apiVersion){
        return `<?xml version="1.0" encoding="UTF-8"?>
            <Package xmlns="http://soap.sforce.com/2006/04/metadata">
                <types>
                <members>*</members>
                <name>${name}</name>
                </types>
                <version>${apiVersion}</version>
            </Package>`;
    }

    asyncWait(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async pollDeploymentStatus(deploymentId){
        try {
            while(true){
                await this.asyncWait(1000);
                const data = JSON.parse(await checkDeploymentStatus({deploymentId}));
                if(['Succeeded', 'Canceled', 'Failed', 'SucceededPartial'].includes(data.deployResult.status)){
                    return data.deployResult.status;
                }
            }
        } catch (e) { console.error(e.message || e.body.message || JSON.stringify(e)); }
    }

    async saveTriggers(e){
        const draftValues = e.detail.draftValues;
        const zip = this.zipper();
        const API_VERSION = 56.0;

        const zipTriggers = zip.folder('triggers');
        for(const draft of draftValues){
            const trig = this.triggers.records.find((trig) => trig.id === draft.id);
            const status = draft.isActive ? 'Active' : 'Inactive';
            zipTriggers.file(trig.name + '.trigger-meta.xml', this.getTriggerMetadata(API_VERSION, status));
            zipTriggers.file(trig.name + '.trigger', trig.body);
        }

        const MEMBER = 'ApexTrigger';
        zip.file('package.xml', this.getTriggerPackageXML(MEMBER, API_VERSION));
        const zipString = await zip.generateAsync({type: "base64"});

        this.triggers.draftValues = [];
        this.triggers.errors = {};
        this.isLoading = true;
        try{
            const data = await deployData({zip: zipString});
            const status = await this.pollDeploymentStatus(data.match(/<id>(?<id>\w+)<\/id>/)?.groups?.id);
            if(['Canceled', 'Failed', 'SucceededPartial'].includes(status)){
                throw new Error(`Couldn\t Deploy. Status ${status}}`);
            }
            const updatedTriggers = await getTriggers({
                name: this.name,
                objectName: this.objectName
            });
            this.triggers.records = updatedTriggers;
            //this.triggers.records = this.triggers.records.map(rec => updatedTriggers.find(r => r.id === rec.id) || rec);
            this.showToast('Success', 'Trigger Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveFlows(e){
        const draftValues = e.detail.draftValues;
        const flows = [];

        for(const draft of draftValues){
            const flow = this.flows.records.find((flow) => flow.id === draft.id);
            flows.push({
                flowViewId: flow.id,
                flowDefinitionId: flow.flowDefinitionId,
                activeVersion: draft.isActive ? flow.latestVersion : 0
            })
        }

        this.flows.draftValues = [];
        this.flows.errors = {};
        this.isLoading = true;
        try{
            const responses = await Promise.all(this.chunk(flows).map(chunk => toggleFlows({flows: chunk})));
            const updatedFlows = await getFlows({
                name: this.name,
                objectName: this.objectName
            });
            this.showErrors(responses, 'flows');
            this.flows.records = updatedFlows;
            this.showToast('Success', 'Flow Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveProcessBuilders(e){
        const draftValues = e.detail.draftValues;
        const flows = [];

        for(let draft of draftValues){
            const flow = this.processBuilders.records.find((flow) => flow.id === draft.id);
            flows.push({
                flowViewId: flow.id,
                flowDefinitionId: flow.flowDefinitionId,
                activeVersion: draft.isActive ? flow.latestVersion : 0
            })
        }

        this.processBuilders.draftValues = [];
        this.processBuilders.errors = {};
        this.isLoading = true;
        try{
            const responses = await Promise.all(this.chunk(flows).map(chunk => toggleFlows({flows: chunk})));
            this.processBuilders.records = await getProcessBuilders({name: this.name, objectName: this.objectName});
            this.showErrors(responses, 'processBuilders');
            this.showToast('Success', 'Process Builder Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveWorkflows(e){
        const draftValues = e.detail.draftValues;
        const workflows = [];

        for(const draft of draftValues){
            const workflow = this.workflows.records.find((workflow) => workflow.id === draft.id);
            const metadata = JSON.parse(JSON.stringify(workflow.metadata));
            metadata.active = draft.isActive;
            workflows.push({
                workflowId: draft.id,
                metadata: metadata
            })
        }

        this.workflows.draftValues = [];
        this.workflows.errors = {};
        this.isLoading = true;
        try{
            const responses = await Promise.all(this.chunk(workflows).map(chunk => toggleWorkflows({workflows: chunk})));
            this.workflows.records = await this.getWorkflows({name: this.name, objectName: this.objectName});
            this.showErrors(responses, 'workflows');
            this.showToast('Success', 'Workflow Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveValidationRules(e){
        const draftValues = e.detail.draftValues;
        const validationRules = [];

        for(const draft of draftValues){
            const validationRule = this.validationRules.records.find((v) => v.id === draft.id);
            const metadata = JSON.parse(JSON.stringify(validationRule.metadata));
            metadata.active = draft.isActive;
            validationRules.push({
                validationRuleId: draft.id,
                metadata: metadata
            })
        }


        this.validationRules.draftValues = [];
        this.validationRules.errors = {};
        this.isLoading = true;
        try{
            const responses = 
                await Promise.all(this.chunk(validationRules).map(chunk => toggleValidationRules({validationRules: chunk})));
            this.validationRules.records = await this.getValidationRules({name: this.name, objectName: this.objectName});
            this.showErrors(responses, 'workflows');
            this.showToast('Success', 'Validation Rule Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveSnapshot(){
        const snapshot = {};
        for(let type of this.AUTOMATION_TYPES){
            snapshot[type] = JSON.parse(JSON.stringify(this[type].records));
        }

        this.isLoading = true;
        try{
            const snapshots = await createSnapshot({
                jsonSnapshot: JSON.stringify(snapshot),
                name: this.name || '',
                objectName: this.objectName || ''
            });
            this.snapshots = snapshots;
            this.showToast('Success', 'Snapshot saved', 'success');
        }catch(e){
            this.showToast('Error', 'Saving Snapshot Failed', 'error');
        }finally{
            this.isLoading = false;
        }
    }

    disableSnapshot(){
        this.template.querySelector('[data-snapshot]').value = null;
    }

    selectSnapshot(e){
        const snapshot = this.snapshots.find(snap => snap.id == e.detail.value);
        const snapshotBody = JSON.parse(snapshot.snapshot);
        console.log(JSON.stringify(snapshot));

        this.name = snapshot.queryName || '';
        this.objectName = snapshot.queryObjectName || '';
        
        for(let type of this.AUTOMATION_TYPES){
            this[type].draftValues = [];
            for(let snap of snapshotBody[type]){
                this[type].draftValues.push({id: snap.id, isActive: snap.isActive});
            }
            this[type].records = snapshotBody[type];
        }

        console.log('After Load');
    }

    clearSnapshot(){
        this.selectedSnapshot = null;
        this.template.querySelector('[data-snapshot]').value = null;
        this.editingEnabled = true;

        for(let type of this.AUTOMATION_TYPES){
            this[type].draftValues = [];
        }
    }

    handleNameChange(e){
        this.name = e.target.value;
    }

    handleObjectChange(e){
        this.objectName = e.target.value;
    }

    handleCancel(e){
        console.log(e.target.dataset.automation);
        this.template.querySelector('[data-snapshot]').value = null;
        this[e.target.dataset.automation].draftValues = {};
    }

    async searchAutomations(){
        this.template.querySelector('[data-snapshot]').value = null;
        for(const type of this.AUTOMATION_TYPES){
            this[type].draftValues = {};
        }
        await this.getAutomations();
    }

    createAutomationTabs(){
        this.automations = [];
        for(const type of this.AUTOMATION_TYPES){
            this[type].actions = (e) => this.handleHeaderAction(e, type);
            this[type].save = this['save' + type[0].toUpperCase() + type.slice(1)];
            this[type].columns = this[type + 'Columns'];
            this.automations.push(this[type]);
        }
    }

    async connectedCallback(){

        for(const type of this.AUTOMATION_TYPES){
            this[type].type = type;
            this[type].actions = (e) => this.handleHeaderAction(e, type);
            this[type].save = this['save' + type[0].toUpperCase() + type.slice(1)];
            this[type].filteredRecords = [];
            this[type].errors = {};

            const columnGetter = this.constructor.prototype.__lookupGetter__(`${type}Columns`);
            //const columnGetter = Object.getOwnPropertyDescriptor(this.constructor.prototype, `${type}Columns`);
            this[type].__defineGetter__('columns', columnGetter.bind(this));
            //Object.defineProperty(this[type].prototype, 'columns', columnGetter);
            this.automations.push(this[type]);
        }


        await this.getAutomations();
        this.snapshots = await getSnapshots();
        loadScript(this, JSZIP)
        .then(() => {
            this.zipper = () => new JSZip();
        })
    }
}