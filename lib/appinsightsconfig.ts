import * as ai from "applicationinsights";

export class AppInsightsInstance {
    public prefix: string;
    public roleName: string;
    public roleInstance: string;
    public instrumentationKey: string;
    public trackStatsDMetrics: boolean = false;
    public compressedProperties: boolean = true;
    public initialized: boolean = false;
    
    protected appInsights: ApplicationInsights;

    public init() {
        console.log("[aiconfig] Initializing");
        this.appInsights = ai.setup(this.instrumentationKey);
        
        if (this.roleName) {
            this.aiClient.context.tags[this.aiClient.context.keys.deviceRoleName] = this.roleName;
        }
        if (this.roleInstance) {
            this.aiClient.context.tags[this.aiClient.context.keys.deviceRoleInstance] = this.roleInstance;    
        }
        this.initialized = true;
    }
    public get aiClient(): Client {
        return this.appInsights.client;
    }

}

export class AppInsightsConfig {
    public appinsights : AppInsightsInstance[];
    public compressedProperties : boolean;
    
    public init(){
        for(let instance of this.appinsights)
        {
            instance.init();
        }
    }
}