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
    selectedSnapshot = null;
    comapareSnapshot = '';
    showCompareColumn = false;

    errors = {};

    get isSnapshotListDisabled(){
        return !this.snapshots.length;
    }
    
    get isSaveSnapshotButtonDisabled(){
        return !this.editingEnabled;
    }

    get isAutomationSaveDisabled(){
        return this.comapareSnapshot != '';
    }

    AUTOMATION_TYPES = ['triggers', 'flows', 'processBuilders', 'workflows', 'validationRules'];
    @track
    automations = [];

    zipper;
    searchName = ''
    name = '';
    searchObjectName = '';
    objectName = '';

    @track snapshots = [];
    get snapshotOptions(){
        const filteredSnapshots = this.snapshots.filter(item => item.isShown);
        const options = filteredSnapshots.map((item) => {
            const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'medium'});
            const date = new Date(item.createdDate).getTime();

            return {
                label: item.description,
                description: formatter.format(date),
                value: item.id
            }
        })

        options.unshift({
            label: 'None',
            value: '',
        })

        return options;
    }

    get isComapareSnapshotDisabled(){
        return this.selectedSnapshot == null;
    }

    handleRefreshSnapshots(e){
        this.snapshots = e.detail;
    }

    @track triggers = {
        title: 'Triggers',
        get table(){
            return this.tableRecords.map(item => {
                item['triggerUrl'] = '/lightning/setup/ApexTriggers/page?address=%2F' + item.id;
                return item;
            })
        }
    }

    @track flows = {
        title: 'Flows',
        get table(){
            return this.tableRecords.map(item => {
                item['flowUrl'] = '/builder_platform_interaction/flowBuilder.app?flowId=' + item.activeVersionId;
                item['urlLabel'] = item.activeVersionId ? item.activeVersionId : 'Inactive';
                item['urlStyle'] = item.activeVersionId ? '' : 'disabled';
                return item;
            });
        }
    }

    @track workflows = {
        title: 'Workflow Rules',
        get table(){
            return this.tableRecords.map(item => {
                item['workflowUrl'] = '/' + item.id
                return item;
            })
        }
    }

    @track processBuilders = {
        title: 'Processes',
        get table(){
            return this.tableRecords.map(item => {
                item['versionLabel'] = item.activeVersionId ? item.activeVersionId : 'Inactive';
                return item;
            })
        }
    }

    @track validationRules = {
        title: 'Validation Rules',
        get table(){
            return this.tableRecords.map(item => {
                item['validationRuleUrl'] = '/' + item.id
                return item;
            })
        }
    }

    get actions(){
        const acc = 
            this.editingEnabled ?
            [
                { label: 'Select All', name: 'selectAll' },
                { label: 'Clear All', name: 'clearAll' },
            ] :
            []; 
        return acc;
    } 

    get compareColumn(){
        const snapshot = this.snapshots.find(snap => snap.id == this.comapareSnapshot);
        const label = `Is Active ${snapshot ? '(' + snapshot.description + ')' : ''}`;
        return {label: label, fieldName: 'isActiveCompare', type: 'boolean'}
    }

    //compareColumn = {label: 'Is Active Compare', fieldName: 'isActiveCompare', type: 'boolean'};

    get mainColumn(){
        const snapshot = this.snapshots.find(snap => snap.id == this.selectedSnapshot);
        const label = `Is Active ${snapshot ? '(' + snapshot.description + ')' : ''}`;
        return { label: label, fieldName: 'isActive', type: 'boolean', 
            //editable : true,
            editable: {'fieldName' : 'isEditable'}, 
            actions: this.actions
        }
    }
    
    get triggersColumns() {
        return [
            this.mainColumn,
            ...(this.showCompareColumn ? [this.compareColumn] : []),
            { label: 'Id', fieldName: 'triggerUrl', type: 'url', typeAttributes: {
                label: {fieldName: 'id'},
                target: '_blank', }
            },
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'},
        ];
    }

    get flowsColumns() {
        return [
            this.mainColumn,
            ...(this.showCompareColumn ? [this.compareColumn] : []),
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
            this.mainColumn,
            ...(this.showCompareColumn ? [this.compareColumn] : []),
            { label: 'Active Version Id', fieldName: 'versionLabel'},
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    get workflowsColumns() {
        return [
            this.mainColumn,
            ...(this.showCompareColumn ? [this.compareColumn] : []),
            { label: 'Id', fieldName: 'workflowUrl', type: 'url', typeAttributes: {"label": {"fieldName": "id"},"target": "_blank"} },
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    get validationRulesColumns() {
        return [
            this.mainColumn,
            ...(this.showCompareColumn ? [this.compareColumn] : []),
            { label: 'Id', fieldName: 'validationRuleUrl', type: 'url', typeAttributes: {"label": {"fieldName": "id"},"target": "_blank"} },
            { label: 'Name', fieldName: 'name'},
            { label: 'Related Object', fieldName: 'relatedObject'}
        ];
    }

    handleHeaderAction(e, type){
        const actionName = e.detail.action.name;
        this[type].draftValues = [];
        
        if(actionName === 'selectAll'){
            this.template.querySelector('[data-snapshot]').value = '';
            for(const item of this[type].filteredRecords){
                this[type].draftValues.push({id: item.id, isActive: true});
            }
        }

        if(actionName === 'clearAll'){
            this.template.querySelector('[data-snapshot]').value = '';
            for(const item of this[type].filteredRecords){
                this[type].draftValues.push({id: item.id, isActive: false});
            }
        }
    }

    handleRowChange(e){
        console.log(JSON.stringify(e.detail));
        this.selectedSnapshot = '';
        const draftValue = e.detail.draftValues[0];
        const automationType = e.target.dataset.automation;
        const currentDraft = this[automationType].draftValues.find(item => item.id == draftValue.id);
        if(currentDraft){
            currentDraft.isActive = draftValue.isActive;
        }else{
            this[automationType].draftValues.push(draftValue);
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
            name: '',
            objectName: ''
        };

        try{
            let [triggers, flows, processBuilders, workflows, validationRules] = await Promise.all([
                getTriggers(payload),
                getFlows(payload),
                getProcessBuilders(payload),
                this.getWorkflows(payload),
                this.getValidationRules(payload)
            ]);

            this.triggers.records = this.triggers.filteredRecords = triggers;
            this.flows.records = this.flows.filteredRecords = flows;
            this.processBuilders.records = this.processBuilders.filteredRecords = processBuilders;
            this.workflows.records = this.workflows.filteredRecords = workflows;
            this.validationRules.records = this.validationRules.filteredRecords = validationRules;
            //this.filterAutomations();
        }catch(e){
            console.error(e.message || e.body.message || JSON.stringify(e));
            this.showToast('Error', e.message, 'error');
        }
        finally{
            this.isLoading = false;
        }
    }

    showTriggerErrors(response){
        const errors = {};
        for(const detail of response.deployResult.details.componentFailures){
            const trigger = this.triggers.records.find(item => detail.fullName == item.name);
            errors[trigger.id] = {
                title: detail.problemType,
                messages: detail.problem
            }
        }

        this.triggers.errors = {
            rows: errors
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
                    return data;
                    //return data.deployResult.status;
                }
            }
        } catch (e) { console.error(e.message || e.body.message || JSON.stringify(e)); }
    }

    async saveTriggers(e){
        const draftValues = this.triggers.draftValues;
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
        let deployStatus;

        try{
            const data = await deployData({zip: zipString});
            deployStatus = await this.pollDeploymentStatus(data.match(/<id>(?<id>\w+)<\/id>/)?.groups?.id);

            if(['Canceled', 'Failed', 'SucceededPartial'].includes(deployStatus.deployResult.status)){
                throw new Error(`Couldn\'t Deploy. Status ${deployStatus.deployResult.status}`);
            }

            const updatedRecords = await getTriggers({
                name: this.name,
                objectName: this.objectName
            });
            this.triggers.filteredRecords = updatedRecords;
            this.triggers.records = this.triggers.records.map(rec => updatedRecords.find(r => r.id === rec.id) || rec);
            this.showToast('Success', 'Trigger Statuses Changed Successfully', 'success');
        }catch(e){
            this.showTriggerErrors(deployStatus);
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveFlows(e){
        const draftValues = this.flows.draftValues;
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
            const updatedRecords = await getFlows({
                name: this.name,
                objectName: this.objectName
            });
            
            this.flows.filteredRecords = updatedRecords;
            this.flows.records = this.flows.records.map(rec => updatedRecords.find(r => r.id === rec.id) || rec);
            this.showErrors(responses, 'flows');
            this.showToast('Success', 'Flow Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveProcessBuilders(e){
        const draftValues = this.processBuilders.draftValues;
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
            const updatedRecords = await getProcessBuilders({name: this.name, objectName: this.objectName});
            this.processBuilders.filteredRecords = updatedRecords;
            this.processBuilders.records = this.processBuilders.records.map(
                rec => updatedRecords.find(r => r.id === rec.id) || rec
            );
            this.showErrors(responses, 'processBuilders');
            this.showToast('Success', 'Process Builder Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveWorkflows(e){
        const draftValues = this.workflows.draftValues;
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
            const updatedRecords = await this.getWorkflows({name: this.name, objectName: this.objectName});
            this.workflows.filteredRecords = updatedRecords;
            this.workflows.records = this.workflows.records.map(
                rec => updatedRecords.find(r => r.id === rec.id) || rec
            );
            this.showErrors(responses, 'workflows');
            this.showToast('Success', 'Workflow Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    async saveValidationRules(e){
        const draftValues = this.validationRules.draftValues;
        const validationRules = [];

        for(const draft of draftValues){
            const validationRule = this.validationRules.records.find((v) => v.id === draft.id);
            const metadata = JSON.parse(JSON.stringify(validationRule.metadata));
            metadata.active = draft.isActive;
            validationRules.push({
                validationRuleId: draft.id,
                metadata: metadata,
            });
        }

        this.validationRules.draftValues = [];
        this.validationRules.errors = {};
        this.isLoading = true;
        try{
            const responses = 
                await Promise.all(this.chunk(validationRules).map(chunk => toggleValidationRules({validationRules: chunk})));
            const updatedRecords = await this.getValidationRules({name: this.name, objectName: this.objectName});
            this.validationRules.filteredRecords = updatedRecords;
            this.validationRules.records = this.validationRules.records.map(
                rec => updatedRecords.find(r => r.id === rec.id) || rec
            );
            this.showErrors(responses, 'workflows');
            this.showToast('Success', 'Validation Rule Statuses Changed Successfully', 'success');
        }catch(e){
            this.showToast('Error', e.message || e.body.message || JSON.stringify(e), 'error');
        }finally{
            this.isLoading = false;
        }
    }

    selectSnapshot(e){
        this.selectedSnapshot = e.detail.value;
        const snapshot = this.snapshots.find(snap => snap.id == e.detail.value);

        if(!snapshot){
            for(const type of this.AUTOMATION_TYPES){
                this[type].draftValues = [];
                this[type].filteredRecords = this[type].records;
            }
            return;
        }

        const snapshotJSON = JSON.parse(snapshot.snapshot);

        this.name = snapshot.queryName || '';
        this.objectName = snapshot.queryObjectName || '';

        for(const type of this.AUTOMATION_TYPES){
            this[type].filteredRecords = [];
            this[type].draftValues = [];
            const recordIds = this[type].records.map(record => record.id);
            snapshotJSON[type] = snapshotJSON[type].filter(item => recordIds.includes(item.id));

            for(const snap of snapshotJSON[type]){
                this[type].draftValues.push({id: snap.id, isActive: snap.isActive});
                this[type].filteredRecords.push(this[type].records.find(item => item.id == snap.id));
            }

        }

    }

    selectCompareSnapshot(e){
        this.comapareSnapshot = e.detail.value;
        const snapshot = this.snapshots.find(snap => snap.id == e.detail.value);

        if(snapshot == null){
            for(const type of this.AUTOMATION_TYPES){
                this[type].compareRecords = [];
            }

            //this.editingEnabled = true;
            this.showCompareColumn = false;
            return;
        }

        //this.editingEnabled = false;
        const snapshotJSON = JSON.parse(snapshot.snapshot);
        for(const type of this.AUTOMATION_TYPES){
            const recordIds = this[type].records.map(record => record.id);
            this[type].compareRecords = snapshotJSON[type].filter(item => recordIds.includes(item.id))
        }

        this.showCompareColumn = true;
    }

    handleCancel(e){
        this.selectedSnapshot = null;
        this[e.target.dataset.automation].draftValues = [];
    }

    async searchAutomations(){
        this.template.querySelector('[data-snapshot]').value = '';
        this.template.querySelector('[data-compare-snapshot]').value = '';
        this.showCompareColumn = false;
        this.name = this.template.querySelector('[data-name]').value.toLowerCase();
        this.objectName = this.template.querySelector('[data-object-name]').value.toLowerCase();

        for(const type of this.AUTOMATION_TYPES){
            this[type].compareRecords = [];
            this[type].draftValues = [];
        }

        this.filterAutomations();
    }

    filterAutomations(){
        const objectNames = this.objectName.toLowerCase().split(',').map(item => item.trim());
        
        for(const type of this.AUTOMATION_TYPES){
            // if(type == 'processBuilders'){
            //     this[type].filteredRecords = this[type].records.filter(item => 
            //         item.name.toLowerCase().includes(this.name) 
            //     );
            // }else{
                this[type].filteredRecords = this[type].records.filter(item => 
                    item.name.toLowerCase().includes(this.name) && 
                    objectNames.reduce((acc, val) => acc || item.relatedObject.toLowerCase().includes(val), false)
                );
            //}
        }
    }

    showSnapshotManagerModal(e){
        this.template.querySelector('[data-snapshots-list]').showModal();
    }

    showSnapshotSaveModal(e){
        const snapshot = {};
        for(let type of this.AUTOMATION_TYPES){
            snapshot[type] = this[type].filteredRecords.map(
                item => {
                    return {id: item.id, isActive: item.isActive};
                }
            );
        }

        this.template.querySelector('[data-snapshot-save]').showModal(
            this.name, 
            this.objectName, 
            JSON.stringify(snapshot)
        );
    }

    tableRecords(){
        const records = JSON.parse(JSON.stringify(this.filteredRecords))
            .map(rec => {rec.isEditable = true; return rec;});
            
        for(const record of this.compareRecords){
            const commonRecord = this.filteredRecords.find(item => item.id == record.id);
            if(!commonRecord){
                const rec = JSON.parse(JSON.stringify(this.records.find(item => item.id == record.id)));
                rec.isEditable = false;
                delete rec.isActive;
                records.push(rec);
            }
        }

        return records;
    }

    tableDraftValues(){
        const draftValues = JSON.parse(JSON.stringify(this.draftValues));

        for(const record of this.compareRecords){
            const draft = draftValues.find(draft => draft.id == record.id);
            if(draft){
                draft.isActiveCompare = record.isActive;
                continue;
            }
            draftValues.push({id: record.id, isActiveCompare: record.isActive});
        }

        return draftValues;
    }

    async connectedCallback(){
        for(const type of this.AUTOMATION_TYPES){
            this[type].type = type;
            this[type].records = [];
            this[type].filteredRecords = [];
            this[type].compareRecords = [];
            this[type].draftValues = [];
            this[type].actions = (e) => this.handleHeaderAction(e, type);
            this[type].save = this['save' + type[0].toUpperCase() + type.slice(1)];
            this[type].errors = {};

            const columnGetter = this.constructor.prototype.__lookupGetter__(`${type}Columns`);
            //const columnGetter = Object.getOwnPropertyDescriptor(this.constructor.prototype, `${type}Columns`);
            this[type].__defineGetter__('columns', columnGetter.bind(this));
            this[type].__defineGetter__('tableRecords', this.tableRecords);
            this[type].__defineGetter__('tableDraftValues', this.tableDraftValues);
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

    isRendered = false;

    renderedCallback(){
        if(!this.isRendered){
            const tabset = this.template.querySelector('lightning-tabset');
            if(tabset){
                const tabContentHeight = tabset.clientHeight - 39;
                tabset.style.setProperty('--tab-content-height', `${tabContentHeight}px`);
            }
        }
        this.isRendered = true;
    }
}