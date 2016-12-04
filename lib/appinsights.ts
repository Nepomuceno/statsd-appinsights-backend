/**
 * Application Insights StatsD backend
 */

console.log("[aibackend] Starting...");

import events = require("events");
import util = require("util");
import {AppInsightsConfig} from './appinsightsconfig';

import * as ai from 'applicationinsights';

class AppInsightsBackend {

    protected config : AppInsightsConfig;
    
    public static init = function(startupTime: number, config: AppInsightsConfig, events: events.EventEmitter) {
        const instance = new AppInsightsBackend(config);
        instance.init(events);
        return true;
    };
    
    public constructor(config: AppInsightsConfig) {
       this.config = config;
       this.config.init();
    }
    
    protected init(events: events.EventEmitter) {
        console.log("[aibackend] Registering for 'flush' event");
        events.on("flush", this.onFlush.bind(this));
    }
    
    protected onFlush(timestamp: string, metrics: any) {
        console.log("[aibackend] OnFlush called");
        for(let appInstance of this.config.appinsights)
        {
            // Process counters
            let countersTracked = 0;
            for (const counterKey in metrics.counters) {
                if (!this.shouldProcess(counterKey,appInstance.prefix,appInstance.trackStatsDMetrics)) {
                    continue;
                }
                const parsedCounterKey = this.parseKey(counterKey,appInstance.prefix, appInstance.aiClient);
                const counter = metrics.counters[counterKey];
                
                appInstance.aiClient.trackMetric(parsedCounterKey.metricname, counter, null, null, null, null, parsedCounterKey.properties);
                countersTracked++;
            };
            console.log("[aibackend] %d counters tracked", countersTracked);
                
            // Process timer data
            let timerDataTracked = 0;
            for (const timerKey in metrics.timer_data) {
                if (!this.shouldProcess(timerKey,appInstance.prefix,appInstance.trackStatsDMetrics)) {
                    continue;
                }
                const parsedTimerKey = this.parseKey(timerKey,appInstance.prefix, appInstance.aiClient);
                const timer = metrics.timer_data[timerKey];
                
                appInstance.aiClient.trackMetric(
                    parsedTimerKey.metricname, 
                    timer.sum,
                    timer.count,
                    timer.lower,
                    timer.upper,
                    timer.std,
                    parsedTimerKey.properties);
                timerDataTracked++;
            };
            console.log("[aibackend] %d timer data tracked", timerDataTracked);

            // Process gauges
            let gaugesTracked = 0;
            for (const gaugeKey in metrics.gauges) {
                if (!this.shouldProcess(gaugeKey,appInstance.prefix,appInstance.trackStatsDMetrics)) {
                    continue;
                }
                const parsedGaugeKey = this.parseKey(gaugeKey,appInstance.prefix, appInstance.aiClient);
                const gauge = metrics.gauges[gaugeKey];
                
                appInstance.aiClient.trackMetric(parsedGaugeKey.metricname, gauge, null, null, null, null, parsedGaugeKey.properties);
                gaugesTracked++;
            };
            console.log("[aibackend] %d gauges tracked", gaugesTracked);
        }
        
        console.log("[aibackend] OnFlush completed");

        return true;
    }
    
    protected shouldProcess(key: string,prefix:string, trackStatsDMetrics: boolean): boolean  {
        if (!trackStatsDMetrics && key.indexOf("statsd.") === 0) {
            return false;
        }
        
        if (prefix !== undefined && prefix !== null) {
            return key.indexOf(prefix) === 0;
        }
        
        return true;
    }
    
    protected parseKey(key: string, prefix: string,aiClient: Client) {
        // Remove the prefix if it is set
        if (prefix) {
            if (key.indexOf(prefix) === 0) {
                key = key.substr(prefix.length);
            }
        }

        // Get metric name
        const endOfNameIndex = key.indexOf("__");
        const metricName = endOfNameIndex > 0 ? key.substring(0, endOfNameIndex) : key;

        // Get properties
        let properties: { [key: string]: string } = undefined;
        if (endOfNameIndex > 0) {
            const propertiesString = key.substring(endOfNameIndex + 2);

            try {
                const buffer = new Buffer(propertiesString, "base64");
                properties = JSON.parse(buffer.toString("utf8"));
            } catch (error) {
                aiClient.trackException(new Error("Failed to parse properties string from key '" + key + "': " + util.inspect(error)));
            }
        }

        return {
            metricname : metricName,
            properties: properties,
        };
    }
};

console.log("[aibackend] Started");

export = AppInsightsBackend;