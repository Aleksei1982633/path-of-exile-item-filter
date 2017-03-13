"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const assert = require("assert");
const settings = require("./settings");
const filterData = require("./filter-manager");
var registry;
var subscriptions;
const filterMessages = new Map();
const unsavedFilterMessages = new Map();
function setMessages() {
    const enableLinter = settings.config.generalSettings.enableLinter.get();
    if (enableLinter) {
        registry.deleteMessages();
        var messages = [];
        filterMessages.forEach((array) => {
            array.forEach((message) => {
                var result;
                if (message.text) {
                    result = {
                        text: message.text,
                        type: message.type,
                        filePath: message.filePath,
                        range: message.range,
                        fix: message.fix,
                        severity: message.severity
                    };
                }
                else if (message.html) {
                    result = {
                        text: message.html,
                        type: message.type,
                        filePath: message.filePath,
                        range: message.range,
                        fix: message.fix,
                        severity: message.severity
                    };
                }
                else {
                    throw new Error("invalid message passed to the linter");
                }
                messages.push(result);
            });
        });
        registry.setMessages(messages);
    }
    else {
        registry.deleteMessages();
    }
}
function activate(r) {
    assert(filterMessages.size == 0 || unsavedFilterMessages.size == 0, "activation called unexpectedly.");
    if (subscriptions)
        subscriptions.dispose();
    registry = r;
    subscriptions = new atom_1.CompositeDisposable;
    var activePaneID;
    subscriptions.add(filterData.emitter.on("poe-did-destroy-buffer", (id) => {
        filterMessages.delete(id);
        unsavedFilterMessages.delete(id);
        setMessages();
    }));
    subscriptions.add(settings.config.generalSettings.enableLinter.onDidChange(setMessages));
    subscriptions.add(filterData.emitter.on("poe-did-process-filter", (args) => {
        var messages = [];
        for (var line of args.lines) {
            if (line.messages)
                messages = messages.concat(line.messages);
        }
        if (args.editor.buffer.getPath()) {
            filterMessages.set(args.editor.buffer.id, messages);
        }
        else {
            unsavedFilterMessages.set(args.editor.buffer.id, messages);
        }
        setMessages();
    }));
    subscriptions.add(filterData.emitter.on("poe-did-rename-filter", (args) => {
        var messages = filterMessages.get(args.editor.buffer.id);
        if (!messages) {
            messages = unsavedFilterMessages.get(args.editor.buffer.id);
            unsavedFilterMessages.delete(args.editor.buffer.id);
            assert(args.editor.buffer.getPath(), "expected file to always exist on file rename");
            if (messages) {
                filterMessages.set(args.editor.buffer.id, messages);
            }
            else {
                throw new Error("buffer with path '" + args.editor.buffer.getPath() +
                    "' had no stored messages");
            }
        }
        for (var message of messages) {
            message.filePath = args.path;
        }
        setMessages();
    }));
}
exports.activate = activate;
function deactivate() {
    filterMessages.clear();
    unsavedFilterMessages.clear();
    subscriptions.dispose();
}
exports.deactivate = deactivate;
