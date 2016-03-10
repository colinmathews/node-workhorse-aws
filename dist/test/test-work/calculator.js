"use strict";
var es6_promise_1 = require('es6-promise');
var node_workhorse_1 = require('node-workhorse');
var Calculator = (function () {
    function Calculator() {
        this.errors = [];
        this.baseWorkPath = __dirname + "/";
    }
    Calculator.prototype.run = function (work) {
        var _this = this;
        return new es6_promise_1.Promise(function (ok, fail) {
            var input = work.input;
            if (typeof (input.x) !== 'number' || typeof (input.y) !== 'number') {
                return fail(new Error('Inputs must be numbers'));
            }
            var children;
            if (input.twice) {
                _this.workhorse.logger.logInsideWork(work, 'Creating child work');
                children = _this.createChildWork(input);
            }
            _this.workhorse.logger.logInsideWork(work, 'Performing addition');
            ok({
                result: input.x + input.y,
                childWork: children
            });
        });
    };
    Calculator.prototype.createChildWork = function (input) {
        return [new node_workhorse_1.Work(this.baseWorkPath + "calculator", {
                x: input.x,
                y: input.y
            })];
    };
    Calculator.prototype.onChildrenDone = function (work) {
        return es6_promise_1.Promise.resolve();
    };
    return Calculator;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Calculator;
//# sourceMappingURL=calculator.js.map