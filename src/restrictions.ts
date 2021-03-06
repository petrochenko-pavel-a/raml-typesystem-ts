/// <reference path="../typings/main.d.ts" />
import ts=require("./typesystem")

import _= require("underscore");
import {AndRestriction} from "./typesystem";
import {Constraint} from "./typesystem";

/**
 * this class is an abstract super type for every constraint that can select properties from objects
 */
abstract class MatchesProperty extends ts.Constraint{
     matches(s:string):boolean{
         return false;
     }

    constructor(){super()}

    check(i:any):ts.Status{
        throw new Error("Should be never called");
    }

    validateProp(i: any,n:string, t:ts.AbstractType){
        var vl=i[n];
        if (vl!==null&&vl!==undefined){
            var st=t.validate(vl);
            if (!st.isOk()){
                return ts.error("value of declareProperty "+n+ ": "+st.getMessage())
            }
        }
        return ts.OK_STATUS;
    }
}
/**
 * this is a constraint which checks that object has no unknown properties if at has not additional properties
 */
export class KnownPropertyRestriction extends ts.Constraint{

    constructor(){
        super();
    }

    facetName(){
        return "onlyKnownProperties"
    }

    requiredType(){
        return ts.OBJECT;
    }

    check(i:any):ts.Status{
        var nm:{ [name:string]:boolean}={};
        Object.getOwnPropertyNames(i).forEach(n=>nm[n]=true);
        var mp:MatchesProperty[]=<MatchesProperty[]>this.owner().metaOfType(<any>MatchesProperty);
        Object.getOwnPropertyNames(i).forEach(p=>{
            mp.forEach(v=>{
                if (v.matches(p)){
                    delete nm[p];
                }
            });
        })
        if (Object.keys(nm).length>0){
            return ts.error("unmatched properties:"+Object.keys(nm).join(","));
        }
        return ts.OK_STATUS;
    }
}
/**
 * this constaint checks that object has a particular property
 */
export class HasProperty extends ts.Constraint{

    constructor(private name: string){
        super();
    }
    check(i:any):ts.Status{
        if (i.hasOwnProperty(this.name)){
            return ts.OK_STATUS;
        }
        return ts.error("should have declareProperty: "+this.name);
    }

    requiredType(){
        return ts.OBJECT;
    }

    facetName(){
        return "knownProperties"
    }

    composeWith(r:Constraint):Constraint{
        if (r instanceof  HasProperty){
            var hp:HasProperty=r;
            if (hp.name===this.name){
                return this;
            }
        }
        return null;
    }
}
function intersect(t0:ts.AbstractType,t1:ts.AbstractType):ts.AbstractType{
    return ts.intersect("X",[t0,t1]);

}
function release(t:ts.AbstractType){

}
/**
 * this constraint checks that property has a particular tyoe if exists
 */
export class PropertyIs extends MatchesProperty{

    constructor(private name: string,private type:ts.AbstractType){
        super();
    }
    matches(s:string):boolean{
        return s===this.name;
    }

    check(i:any):ts.Status{
        if (i.hasOwnProperty(this.name)){
            var st=this.validateProp(i,this.name,this.type);
            return st;
        }
        return ts.OK_STATUS;
    }
    requiredType(){
        return ts.OBJECT;
    }

    facetName(){
        return "propertyIs"
    }

    composeWith(t:ts.Constraint):ts.Constraint{
        if (t instanceof PropertyIs){
            var pi:PropertyIs=t;
            if (pi.name===this.name){
                if (this.type.typeFamily().indexOf(pi.type)!=-1){
                    return pi;
                }
                if (pi.type.typeFamily().indexOf(this.type)!=-1){
                    return this;
                }
                    var intersectionType = intersect(this.type, pi.type);
                try {
                    var is:ts.Status = intersectionType.checkConfluent();
                    if (!is.isOk()) {
                        var rc=<ts.RestrictionsConflict>is;
                        return rc.toRestriction();
                    }
                    return new PropertyIs(this.name, intersectionType);
                }finally {
                    release(intersectionType);
                }
            }
        }
        return null;
    }
}
/**
 * this cosnstraint checks that map property values passes to particular type if exists
 */
export class MapPropertyIs extends MatchesProperty{

    constructor(private regexp: string,private type:ts.AbstractType){
        super();
    }
    matches(s:string):boolean{
       if (s.match(this.regexp)){
           return true;
       }
        return false;
    }

    requiredType(){
        return ts.OBJECT;
    }

    facetName(){
        return "mapPropertyIs"
    }

    composeWith(t:ts.Constraint):ts.Constraint{
        if (t instanceof MapPropertyIs){
            var pi:MapPropertyIs=t;
            if (pi.regexp===this.regexp){
                if (this.type.typeFamily().indexOf(pi.type)!=-1){
                    return pi;
                }
                if (pi.type.typeFamily().indexOf(this.type)!=-1){
                    return this;
                }
                var intersectionType = intersect(this.type, pi.type);
                try {
                    var is:ts.Status = intersectionType.checkConfluent();
                    if (!is.isOk()) {
                        var rc=<ts.RestrictionsConflict>is;
                        return rc.toRestriction();
                    }
                    return new MapPropertyIs(this.regexp, intersectionType);
                }finally {
                    release(intersectionType);
                }
            }
        }
        return null;
    }

    check(i:any):ts.Status{
        Object.getOwnPropertyNames(i).forEach(n=>{
            if (n.match(this.regexp)){
                var stat=this.validateProp(i,n,this.type);
                if (!stat.isOk()){
                    return stat;
                }
            }
        });
        return ts.OK_STATUS;
    }
}
/**
 * this constraint tests that additional property
 */
export class AdditionalPropertyIs extends MatchesProperty{

    constructor(private type:ts.AbstractType){
        super();
    }
    matches(s:string):boolean{
        return s===name;
    }

    requiredType(){
        return ts.OBJECT;
    }

    facetName(){
        return "additionalProperties"
    }

    match(n:string):boolean{
        var all:PropertyIs[]=<any>this.owner().metaOfType(<any>PropertyIs);
        var map:MapPropertyIs[]=<any>this.owner().metaOfType(<any>MapPropertyIs);
        for (var i=0;i<all.length;i++){
            if (all[i].matches(n)){
                return true;
            }
        }
        for (var i=0;i<map.length;i++){
            if (map[i].matches(n)){
                return true;
            }
        }
        return false;
    }
    composeWith(t:ts.Constraint):ts.Constraint{
        if (t instanceof AdditionalPropertyIs){
            var pi:AdditionalPropertyIs=t;

            if (this.type.typeFamily().indexOf(pi.type)!=-1){
                return pi;
            }
            if (pi.type.typeFamily().indexOf(this.type)!=-1){
                return this;
            }
            var intersectionType = intersect(this.type, pi.type);
            try {
                var is:ts.Status = intersectionType.checkConfluent();
                if (!is.isOk()) {
                    var rc=<ts.RestrictionsConflict>is;
                    return rc.toRestriction();
                }
                return new AdditionalPropertyIs( intersectionType);
            }finally {
                release(intersectionType);
            }

        }
        return null;
    }
    check(i:any):ts.Status{
        var t=this.type;
        var res=new ts.Status(ts.Status.OK,0,"");
        Object.getOwnPropertyNames(i).forEach(n=>{
            if (!this.match(n)){
                var stat=this.validateProp(i,n,t);
                if (!stat.isOk()){
                    res.addSubStatus(stat);
                }
            }
        });
        return res;
    }
}
/**
 * common super type for a simple restrictions
 */
abstract class FacetRestriction<T> extends ts.Constraint{

    abstract facetName():string
    abstract requiredType():ts.AbstractType;

    abstract checkValue():string
    abstract value():T;


    validateSelf(registry:ts.TypeRegistry):ts.Status{
        if (!this.owner().isSubTypeOf(this.requiredType())){
            return ts.error(this.facetName()+" facet can only be used with "+this.requiredType().name()+" types");
        }
        var m=this.checkValue();
        if (m){
            return ts.error(m);
        }
        return ts.OK_STATUS;
    }

}
/**
 * abstract super type for every min max restriction
 */
abstract class MinMaxRestriction extends FacetRestriction<Number>{

    constructor(private _facetName:string,private _value:number,private _max:boolean,private _opposite:string,
                private _requiredType:ts.AbstractType,private _isInt:boolean){
        super();
    }


    facetName():string {
        return this._facetName;
    }

    isIntConstraint(){
        return this._isInt;
    }
    isMax(){
        return this._max;
    }
    abstract extractValue(i:any): number;
    value(){
        return this._value;
    }

    check(i:any):ts.Status{
        var o=this.extractValue(i);
        if (typeof  o=='number'){
            if (this.isMax()){
                if (this.value()<o){
                    return this.createError();
                }
            }
            else{
                if (this.value()>o){
                    return this.createError();
                }
            }
        }
        return ts.OK_STATUS;
    }
    createError():ts.Status{
        return ts.error(this.toString());
    }

    minValue(){
        if (this._isInt&&!this._max){
            return 0;
        }
        return Number.MIN_VALUE;
    }
    requiredType():ts.AbstractType{
        return this._requiredType;
    }

    checkValue():string{

        if (this.value()<this.minValue()){
            return this.facetName()+" should be at least "+this.minValue();
        }
    }

    composeWith(t:ts.Constraint):ts.Constraint{
        if (t instanceof MinMaxRestriction) {
            var mx = <MinMaxRestriction>t;
            if (mx.facetName() == this.facetName()) {
                if (mx.isMax() == this.isMax()) {
                    if (this.isMax()){
                        if (this.value()<mx.value()){
                            return mx;
                        }
                        else{
                            return this;
                        }
                    }
                    else{
                        if (this.value()>mx.value()){
                            return mx;
                        }
                        else{
                            return this;
                        }
                    }
                }
            }
            if (mx.facetName()===this._opposite){
                if (this.isMax()) {
                    if (mx.value() > this.value()) {
                        return this.nothing(t);
                    }
                }
                else{
                    if (mx.value() < this.value()) {
                        return this.nothing(t);
                    }
                }
            }
        }
        return null;
    }
}
/**
 * maximum  constraint
 */
export class Maximum extends  MinMaxRestriction{
    constructor(val: number){
        super("maximum",val,true,"minimum",ts.NUMBER,false);
    }


    extractValue(i:any):number {
        return i;
    }

    toString(){
        return "value should be not more then " + this.value();
    }
}
/**
 * minimum constraint
 */
export class Minimum extends  MinMaxRestriction{
    constructor(val: number){
        super("minimum",val,false,"maximum",ts.NUMBER,false);
    }


    extractValue(i:any):number {
        return i;
    }

    toString(){
        return "value should be not less then " + this.value();
    }
}
/**
 * max items cosntraint
 */
export class MaxItems extends  MinMaxRestriction{
    constructor(val: number){
        super("maxItems",val,true,"minItems",ts.ARRAY,true);
    }


    extractValue(i:any):number {
        if (Array.isArray(i)) {
            return i.length;
        }
    }

    toString(){
        return "array should have not more then " + this.value()+" items";
    }
}
/**
 * min items cosntraint
 */
export class MinItems extends  MinMaxRestriction{
    constructor(val: number){
        super("minItems",val,false,"maxItems",ts.ARRAY,true);
    }


    extractValue(i:any):number {
        if (Array.isArray(i)) {
            return i.length;
        }
    }

    toString(){
        return "array should have not less then " + this.value()+" items";
    }
}
/**
 * max length
 */
export class MaxLength extends  MinMaxRestriction{
    constructor(val: number){
        super("maxLength",val,true,"minLength",ts.STRING,true);
    }


    extractValue(i:any):number {
        if (typeof i=='string') {
            return i.length;
        }
        return 0;
    }

    toString(){
        return "string length should be not more then " + this.value();
    }
}

/**
 * min length
 */
export class MinLength extends  MinMaxRestriction{
    constructor(val: number){
        super("minLength",val,false,"maxLength",ts.STRING,true);
    }

    extractValue(i:any):number {
        if (typeof i=='string') {
            return i.length;
        }
        return 0;
    }

    toString(){
        return "string length should be not less then " + this.value();
    }
}
/**
 * max properties constraint
 */
export class MaxProperties extends  MinMaxRestriction{
    constructor(val: number){
        super("maxProperties",val,true,"minProperties",ts.OBJECT,true);
    }


    extractValue(i:any):number {
        return Object.keys(i).length;
    }

    toString(){
        return "object should have not more then " + this.value()+" properties";
    }
}
/**
 * min properties constraint
 */
export class MinProperties extends  MinMaxRestriction{
    constructor(val: number){
        super("minProperties",val,false,"maxProperties",ts.OBJECT,true);
    }


    extractValue(i:any):number {
        return Object.keys(i).length;
    }

    toString(){
        return "object should have not less then " + this.value()+" properties";
    }
}
/**
 * unique items constraint
 */
export class UniqueItems extends FacetRestriction<boolean>{

    constructor(private _value:boolean){
        super();
    }
    facetName(){return "uniqueItems"}
    requiredType(){return ts.ARRAY}

    check(i:any):ts.Status{
        if (Array.isArray(i)){
            var r:any[]=i;
            if (_.unique(r).length!= r.length){
                return ts.error(this.toString());
            }
        }
        return ts.OK_STATUS
    }


    composeWith(r:ts.Constraint):ts.Constraint{
        if (r instanceof UniqueItems){
            var mm:UniqueItems=r;
            if (mm._value==this._value){
                return this;
            }
        }
        return null;
    }

    value(){
        return this._value;
    }
    checkValue():string{
        return null;
    }
    toString(){
        return "items should be unique";
    }
}
/**
 * components of array should be of type
 */
export class ComponentShouldBeOfType extends FacetRestriction<ts.AbstractType>{
    facetName(){return "items"}
    requiredType(){return ts.ARRAY}

    constructor(private type:ts.AbstractType){
        super();
    }

    public toString() {
        return "items should be of type " + this.type;
    }
    check(i:any):ts.Status{

        var rs=new ts.Status(ts.Status.OK,0,"");
        if (Array.isArray(i)){
            var ar:any[]=i;
            for (var j=0;j<ar.length;j++){
                rs.addSubStatus(this.type.validate(ar[j]));
            }
        }
        return rs;
    }
    composeWith(t:ts.Constraint):ts.Constraint{
        if (t instanceof ComponentShouldBeOfType){
            var pi:ComponentShouldBeOfType=t;

                if (this.type.typeFamily().indexOf(pi.type)!=-1){
                    return pi;
                }
                if (pi.type.typeFamily().indexOf(this.type)!=-1){
                    return this;
                }
                var intersectionType = intersect(this.type, pi.type);
                try {
                    var is:ts.Status = intersectionType.checkConfluent();
                    if (!is.isOk()) {
                        var rc=<ts.RestrictionsConflict>is;
                        return rc.toRestriction();
                    }
                    return new ComponentShouldBeOfType( intersectionType);
                }finally {
                    release(intersectionType);
                }

        }
        return null;
    }
    checkValue():string{
        return null;
    }

    value(){
        return this.type;
    }


}
/**
 * regular expression (pattern) constraint
 */
export class Pattern extends FacetRestriction<string>{

    constructor(private _value:string){
        super();
    }
    facetName(){return "pattern"}
    requiredType(){return ts.STRING}

    check(i:any):ts.Status{
        if (typeof i=='string'){
            var st:string=i;
            try {
                var mm=st.match(this._value);
                if (!mm){
                    return new ts.Status(ts.Status.ERROR, 0, "string should match to " + this.value());
                }
            }catch (e){

            }
        }
        return ts.OK_STATUS
    }


    composeWith(r:ts.Constraint):ts.Constraint{
        if (r instanceof Pattern){
            var v=<Pattern>r;
            if (v._value===this._value){
                return this;
            }
            return  this.nothing(r,"pattern restrictions can not be composed at one type");
        }
        return null;
    }

    value(){
        return this._value;
    }
    checkValue(){
        try{
            new RegExp(this._value);
        }
        catch (e){
            return e.message;
        }
        return null;
    }
    toString(){
        return "should pass reg exp:"+this.value;
    }
}
/**
 * enum constraint
 */
export class Enum extends FacetRestriction<string[]>{

    constructor(private _value:string[]){
        super();
    }
    facetName(){return "enum"}
    requiredType(){return ts.SCALAR}

    check(i:any):ts.Status{
        if (!_.find(this._value,x=>""+i===x)){
            return ts.error(this.toString());
        }
        return ts.OK_STATUS
    }


    composeWith(r:ts.Constraint):ts.Constraint{
        if (r instanceof Enum){
            var v=<Enum>r;
            var sss= _.intersection(this._value, v._value);
            if (sss.length==0){
                return this.nothing(r);
            }
            return new Enum(sss);
        }
        return null;
    }

    value(){
        return this._value;
    }
    checkValue(){
        if (_.uniq(this._value).length<this._value.length){
            return "enum facet can only contain unique items";
        }
    }
    toString(){
        return "value should be one of:" + this._value;
    }
}
/**
 * this function attempts to optimize to set of restrictions
 * @param r
 * @returns {ts.Constraint[]}
 */
export function optimize(r:ts.Constraint[]){
    r= r.map(x=>x.preoptimize());
    var optimized:ts.Constraint[]=[];
    r.forEach(x=>{
        if (x instanceof  AndRestriction){
            var ar:AndRestriction=x;
            ar.options().forEach(y=>{optimized.push(y)})
        }
        else{
            optimized.push(x);
        }
    })
    var transformed=true;
    l0:while (transformed){
        transformed=false;
        for (var i=0;i<optimized.length;i++){
            for (var j=0;j<optimized.length;j++){
                var rs0=optimized[i];
                var rs1=optimized[j];
                if (rs0!==rs1){
                    var compose=rs0.tryCompose(rs1);
                    if (compose) {
                        var newOptimized = optimized.filter(x=>x !== rs0 && x !== rs1);
                        newOptimized.push(compose);
                        transformed = true;
                        optimized = newOptimized;
                        break;
                    }
                }
            }
            if (transformed){
                break;
            }
        }
    }
    return optimized;
}