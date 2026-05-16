export namespace engine {
	
	export class ChunkStatus {
	    index: number;
	    start: number;
	    end: number;
	    status: string;
	    downloaded: number;
	    headers?: Record<string, string>;
	    retry_count: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new ChunkStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.status = source["status"];
	        this.downloaded = source["downloaded"];
	        this.headers = source["headers"];
	        this.retry_count = source["retry_count"];
	        this.error = source["error"];
	    }
	}
	export class TaskStatus {
	    id: string;
	    url: string;
	    file_name: string;
	    status: string;
	    progress: number;
	    speed: number;
	    downloaded: number;
	    total: number;
	    protocol: string;
	    active_threads: number;
	    remaining_chunks: number;
	    failed_chunks: number;
	    max_connections: number;
	    chunk_size: number;
	    temp_size: number;
	    created_at: string;
	    updated_at: string;
	    chunks: ChunkStatus[];
	
	    static createFrom(source: any = {}) {
	        return new TaskStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.file_name = source["file_name"];
	        this.status = source["status"];
	        this.progress = source["progress"];
	        this.speed = source["speed"];
	        this.downloaded = source["downloaded"];
	        this.total = source["total"];
	        this.protocol = source["protocol"];
	        this.active_threads = source["active_threads"];
	        this.remaining_chunks = source["remaining_chunks"];
	        this.failed_chunks = source["failed_chunks"];
	        this.max_connections = source["max_connections"];
	        this.chunk_size = source["chunk_size"];
	        this.temp_size = source["temp_size"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	        this.chunks = this.convertValues(source["chunks"], ChunkStatus);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace global {
	
	export class Account {
	    id: string;
	    template_id: string;
	    name: string;
	    local_path?: string;
	    credentials?: string;
	    config?: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Account(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.template_id = source["template_id"];
	        this.name = source["name"];
	        this.local_path = source["local_path"];
	        this.credentials = source["credentials"];
	        this.config = source["config"];
	        this.created_at = source["created_at"];
	    }
	}
	export class InstalledPlugin {
	    plugin_id: string;
	    source: string;
	    version: string;
	    installed_at: string;
	
	    static createFrom(source: any = {}) {
	        return new InstalledPlugin(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.plugin_id = source["plugin_id"];
	        this.source = source["source"];
	        this.version = source["version"];
	        this.installed_at = source["installed_at"];
	    }
	}
	export class LanguageInfo {
	    language_name: string;
	    language_code: string;
	    textmap_path: string;
	    translation_progress: string;
	    translator: string;
	    last_updated: string;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new LanguageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.language_name = source["language_name"];
	        this.language_code = source["language_code"];
	        this.textmap_path = source["textmap_path"];
	        this.translation_progress = source["translation_progress"];
	        this.translator = source["translator"];
	        this.last_updated = source["last_updated"];
	        this.version = source["version"];
	    }
	}
	export class LanguagePack {
	    language_name: string;
	    language_code: string;
	    textmap_path: string;
	    translation_progress: string;
	    translator: string;
	    last_updated: string;
	    version: string;
	    textmap: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new LanguagePack(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.language_name = source["language_name"];
	        this.language_code = source["language_code"];
	        this.textmap_path = source["textmap_path"];
	        this.translation_progress = source["translation_progress"];
	        this.translator = source["translator"];
	        this.last_updated = source["last_updated"];
	        this.version = source["version"];
	        this.textmap = source["textmap"];
	    }
	}
	export class MarketPluginInfo {
	    id: string;
	    name: string;
	    version: string;
	    md5: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new MarketPluginInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.version = source["version"];
	        this.md5 = source["md5"];
	        this.description = source["description"];
	    }
	}
	export class PluginChain {
	    id: string;
	    template_id: string;
	    plugin_id: string;
	    sort_order: number;
	
	    static createFrom(source: any = {}) {
	        return new PluginChain(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.template_id = source["template_id"];
	        this.plugin_id = source["plugin_id"];
	        this.sort_order = source["sort_order"];
	    }
	}
	export class Template {
	    id: string;
	    name: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Template(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.created_at = source["created_at"];
	    }
	}

}

export namespace service {
	
	export class ConfigOption {
	    value: string;
	    label: string;
	
	    static createFrom(source: any = {}) {
	        return new ConfigOption(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.value = source["value"];
	        this.label = source["label"];
	    }
	}
	export class ConfigParam {
	    key: string;
	    type: string;
	    label: string;
	    description?: string;
	    placeholder?: string;
	    required?: boolean;
	    default?: any;
	    options?: ConfigOption[];
	
	    static createFrom(source: any = {}) {
	        return new ConfigParam(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.type = source["type"];
	        this.label = source["label"];
	        this.description = source["description"];
	        this.placeholder = source["placeholder"];
	        this.required = source["required"];
	        this.default = source["default"];
	        this.options = this.convertValues(source["options"], ConfigOption);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DownloadListItem {
	    task_id: string;
	    plugin_id: string;
	    file_name: string;
	    created_at: string;
	    status?: engine.TaskStatus;
	
	    static createFrom(source: any = {}) {
	        return new DownloadListItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.task_id = source["task_id"];
	        this.plugin_id = source["plugin_id"];
	        this.file_name = source["file_name"];
	        this.created_at = source["created_at"];
	        this.status = this.convertValues(source["status"], engine.TaskStatus);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DownloaderConfig {
	    output_dir: string;
	    max_conn: number;
	    chunk_size: number;
	
	    static createFrom(source: any = {}) {
	        return new DownloaderConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.output_dir = source["output_dir"];
	        this.max_conn = source["max_conn"];
	        this.chunk_size = source["chunk_size"];
	    }
	}
	export class EngineVersions {
	    client: string;
	    oshinc: string;
	    oshind: string;
	
	    static createFrom(source: any = {}) {
	        return new EngineVersions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.client = source["client"];
	        this.oshinc = source["oshinc"];
	        this.oshind = source["oshind"];
	    }
	}
	export class FileActionRule {
	    match: string;
	    actions: string[];
	
	    static createFrom(source: any = {}) {
	        return new FileActionRule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.match = source["match"];
	        this.actions = source["actions"];
	    }
	}
	export class QrcodeConfig {
	    start_route: string;
	    poll_route: string;
	    poll_interval?: number;
	    poll_timeout?: number;
	
	    static createFrom(source: any = {}) {
	        return new QrcodeConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.start_route = source["start_route"];
	        this.poll_route = source["poll_route"];
	        this.poll_interval = source["poll_interval"];
	        this.poll_timeout = source["poll_timeout"];
	    }
	}
	export class LoginMethod {
	    type: string;
	    label: string;
	    description?: string;
	    params?: ConfigParam[];
	    qrcode?: QrcodeConfig;
	
	    static createFrom(source: any = {}) {
	        return new LoginMethod(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.label = source["label"];
	        this.description = source["description"];
	        this.params = this.convertValues(source["params"], ConfigParam);
	        this.qrcode = this.convertValues(source["qrcode"], QrcodeConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PluginMetadata {
	    description?: string;
	    version?: string;
	    permission?: Record<string, string>;
	    login_methods?: LoginMethod[];
	
	    static createFrom(source: any = {}) {
	        return new PluginMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.description = source["description"];
	        this.version = source["version"];
	        this.permission = source["permission"];
	        this.login_methods = this.convertValues(source["login_methods"], LoginMethod);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RouteParam {
	    key: string;
	    type: string;
	    label: string;
	    required: boolean;
	    default?: any;
	    placeholder?: string;
	    min?: number;
	    max?: number;
	
	    static createFrom(source: any = {}) {
	        return new RouteParam(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.type = source["type"];
	        this.label = source["label"];
	        this.required = source["required"];
	        this.default = source["default"];
	        this.placeholder = source["placeholder"];
	        this.min = source["min"];
	        this.max = source["max"];
	    }
	}
	export class Route {
	    description: string;
	    params: RouteParam[];
	
	    static createFrom(source: any = {}) {
	        return new Route(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.description = source["description"];
	        this.params = this.convertValues(source["params"], RouteParam);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PluginInfo {
	    id: string;
	    name: string;
	    version: string;
	    description: string;
	    author: string;
	    icon?: string;
	    permissions: string[];
	    routes: Record<string, Route>;
	    capabilities: Record<string, boolean>;
	    config_params?: ConfigParam[];
	    metadata?: PluginMetadata;
	    file_actions?: FileActionRule[];
	
	    static createFrom(source: any = {}) {
	        return new PluginInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.version = source["version"];
	        this.description = source["description"];
	        this.author = source["author"];
	        this.icon = source["icon"];
	        this.permissions = source["permissions"];
	        this.routes = this.convertValues(source["routes"], Route, true);
	        this.capabilities = source["capabilities"];
	        this.config_params = this.convertValues(source["config_params"], ConfigParam);
	        this.metadata = this.convertValues(source["metadata"], PluginMetadata);
	        this.file_actions = this.convertValues(source["file_actions"], FileActionRule);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class PluginResult {
	    success: boolean;
	    message?: string;
	    error?: string;
	    data?: any;
	    task_id?: string;
	    file_name?: string;
	    size?: number;
	
	    static createFrom(source: any = {}) {
	        return new PluginResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.error = source["error"];
	        this.data = source["data"];
	        this.task_id = source["task_id"];
	        this.file_name = source["file_name"];
	        this.size = source["size"];
	    }
	}
	
	
	
	export class SystemInfo {
	    os: string;
	    arch: string;
	    num_cpu: number;
	    hostname: string;
	    go_ver: string;
	    time: string;
	    process_name: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.os = source["os"];
	        this.arch = source["arch"];
	        this.num_cpu = source["num_cpu"];
	        this.hostname = source["hostname"];
	        this.go_ver = source["go_ver"];
	        this.time = source["time"];
	        this.process_name = source["process_name"];
	    }
	}

}

