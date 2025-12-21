import{s as g,c as x,a as l,r as b,f as G,t as q,b as F}from"../chunks/CDtJAJDW.js";import"../chunks/CdqBHIUe.js";import{p as y,f as k,n as $,c as _,d as ae,A as r,B as s,$ as re,D as e,G as h,x as z,F as ie}from"../chunks/43DoFiGK.js";import{I as w,s as I,e as oe,i as ne}from"../chunks/B5-rS708.js";import{h as ce}from"../chunks/D3R2J86X.js";import{B as W}from"../chunks/DnayzfWM.js";import{C as v}from"../chunks/BgxKhnFH.js";function de(o,t){y(t,!0);let n=b(t,["$$slots","$$events","$$legacy"]);const c=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"}]];w(o,g({name:"zap"},()=>n,{get iconNode(){return c},children:(d,u)=>{var a=x(),i=k(a);I(i,()=>t.children??$),l(d,a)},$$slots:{default:!0}})),_()}function le(o,t){y(t,!0);let n=b(t,["$$slots","$$events","$$legacy"]);const c=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}]];w(o,g({name:"shield"},()=>n,{get iconNode(){return c},children:(d,u)=>{var a=x(),i=k(a);I(i,()=>t.children??$),l(d,a)},$$slots:{default:!0}})),_()}function Y(o,t){y(t,!0);let n=b(t,["$$slots","$$events","$$legacy"]);const c=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"}],["path",{d:"M21 3v5h-5"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"}],["path",{d:"M8 16H3v5"}]];w(o,g({name:"refresh-cw"},()=>n,{get iconNode(){return c},children:(d,u)=>{var a=x(),i=k(a);I(i,()=>t.children??$),l(d,a)},$$slots:{default:!0}})),_()}function me(o,t){y(t,!0);let n=b(t,["$$slots","$$events","$$legacy"]);const c=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"}]];w(o,g({name:"layers"},()=>n,{get iconNode(){return c},children:(d,u)=>{var a=x(),i=k(a);I(i,()=>t.children??$),l(d,a)},$$slots:{default:!0}})),_()}var pe=G('<div class="p-5 rounded-xl border bg-card hover:border-primary/50 transition-colors"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><!></div> <div><h3 class="font-semibold mb-1"> </h3> <p class="text-sm text-muted-foreground leading-relaxed"> </p></div></div></div>'),ue=G(`<div class="min-h-screen bg-gradient-to-b from-background to-muted/20"><div class="container mx-auto px-6 py-16 max-w-5xl"><div class="text-center mb-16"><h1 class="text-4xl font-bold mb-4 tracking-tight">Documentation</h1> <p class="text-xl text-muted-foreground max-w-2xl mx-auto">Reliable task scheduling for Cloudflare Durable Objects. Handle
        evictions gracefully with automatic retries and checkpoints.</p></div> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">1</div> <h2 class="text-2xl font-semibold">Install</h2></div> <!></section> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">2</div> <h2 class="text-2xl font-semibold">Basic Setup</h2></div> <!></section> <section class="mb-16"><h2 class="text-2xl font-semibold mb-6">Core Concepts</h2> <div class="grid md:grid-cols-2 gap-4"></div></section> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">3</div> <h2 class="text-2xl font-semibold">Multi-step Tasks</h2></div> <p class="text-muted-foreground mb-4">Use <code class="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">runSteps()</code> for tasks with multiple stages. Progress is automatically tracked and resumable.</p> <!></section> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold"><!></div> <h2 class="text-2xl font-semibold">Infinite Loop Tasks</h2></div> <p class="text-muted-foreground mb-4">For background processors, game loops, or any task that runs forever.
        Use <code class="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">maxRetries: Infinity</code> to survive DO restarts.</p> <!> <div class="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><p class="text-sm text-amber-800"><strong>Note:</strong> After a DO restart, Effect generators don't
          auto-resume. You need to manually restart infinite loop tasks in your
          constructor. See the <a href="/docs/api" class="underline hover:text-amber-100">API reference</a> for the full pattern.</p></div></section> <section class="text-center py-12 border-t border-dashed border-muted-foreground/20"><h2 class="text-xl font-semibold mb-4">Ready to dive deeper?</h2> <div class="flex justify-center gap-4"><!> <!></div></section></div></div>`);function ke(o){const t="bun add ironalarm",n=`import { ReliableScheduler } from 'ironalarm';
import { DurableObject } from 'cloudflare:workers';
import { Effect } from 'effect';

export class MyDO extends DurableObject {
  private scheduler: ReliableScheduler;

  constructor(ctx: any, env: any) {
    super(ctx, env);
    this.scheduler = new ReliableScheduler(this.ctx.storage);

    // Register a task handler
    this.scheduler.register('my-task', (sched, taskId, params) =>
      Effect.gen(function* () {
        // Check if already started (for resume after eviction)
        const started = yield* Effect.promise(() => 
          sched.getCheckpoint(taskId, 'started')
        );
        
        if (!started) {
          yield* Effect.promise(() => doExpensiveWork(params));
          yield* Effect.promise(() => 
            sched.checkpoint(taskId, 'started', true)
          );
        }
        
        yield* Effect.promise(() => sched.completeTask(taskId));
      })
    );
  }

  async alarm() {
    await this.scheduler.alarm();
  }

  async startTask(params: any) {
    const taskId = ReliableScheduler.generateTaskId();
    await this.scheduler.runNow(taskId, 'my-task', params);
    return taskId;
  }
}`,c=`this.scheduler.register('agent-loop', (sched, taskId, params) =>
  Effect.gen(function* () {
    yield* Effect.promise(() =>
      sched.runSteps(taskId, [
        'researching',
        'analyzing', 
        'synthesizing',
        'writing',
        'finalizing'
      ], {
        stepDuration: 2000,
        autoComplete: true,
        onStep: async (stepName, stepIndex) => {
          console.log(\`Step \${stepIndex + 1}: \${stepName}\`);
          // Your step logic here
        }
      })
    );
  })
);`,d=`// Register an infinite loop handler
this.scheduler.register('mining-loop', (sched, taskId, params) =>
  Effect.gen(function* () {
    while (true) {
      const task = yield* Effect.promise(() => sched.getTask(taskId));
      if (!task || task.status === 'paused') return;

      // Do work each iteration
      yield* Effect.promise(() => mineResources(params));
      
      // Update cycle counter
      const cycle = (yield* Effect.promise(() => 
        sched.getCheckpoint(taskId, 'cycle')
      ) || 0) as number;
      yield* Effect.promise(() => 
        sched.checkpoint(taskId, 'cycle', cycle + 1)
      );

      // Wait before next iteration
      yield* Effect.promise(() => 
        new Promise(r => setTimeout(r, 5000))
      );
    }
  })
);

// Start with infinite retries (survives DO restarts)
await this.scheduler.runNow(
  taskId, 
  'mining-loop', 
  params, 
  { maxRetries: Infinity }
);`,u=[{icon:le,title:"Eviction Safety",description:"30-second safety alarm automatically retries tasks if your DO gets evicted mid-execution."},{icon:Y,title:"Checkpoints",description:"Save progress at key points. On retry, skip already-completed work for true resumability."},{icon:me,title:"Named Handlers",description:"Register handlers by name (string) - no function serialization issues."},{icon:de,title:"Single Queue",description:"One alarm drives all tasks. Reliable, sequential execution from a unified queue."}];var a=ue();ce("1xmjmrw",p=>{ae(()=>{re.title="Documentation - ironalarm"})});var i=s(a),E=r(s(i),2),Q=r(s(E),2);v(Q,{code:t,lang:"bash"}),e(E);var S=r(E,2),V=r(s(S),2);v(V,{code:n,lang:"typescript"}),e(S);var C=r(S,2),O=r(s(C),2);oe(O,5,()=>u,ne,(p,f)=>{var m=pe(),B=s(m),M=s(B),ee=s(M);z(f).icon(ee,{class:"w-5 h-5 text-primary"}),e(M);var H=r(M,2),j=s(H),te=s(j,!0);e(j);var U=r(j,2),se=s(U,!0);e(U),e(H),e(B),e(m),ie(()=>{F(te,z(f).title),F(se,z(f).description)}),l(p,m)}),e(O),e(C);var R=r(C,2),Z=r(s(R),4);v(Z,{code:c,lang:"typescript"}),e(R);var D=r(R,2),N=s(D),P=s(N),J=s(P);Y(J,{class:"w-4 h-4"}),e(P),h(2),e(N);var K=r(N,4);v(K,{code:d,lang:"typescript"}),h(2),e(D);var A=r(D,2),T=r(s(A),2),L=s(T);W(L,{href:"/docs/api",size:"lg",children:(p,f)=>{h();var m=q("API Reference");l(p,m)},$$slots:{default:!0}});var X=r(L,2);W(X,{href:"/mission",variant:"outline",size:"lg",children:(p,f)=>{h();var m=q("Try the Demo");l(p,m)},$$slots:{default:!0}}),e(T),e(A),e(i),e(a),l(o,a)}export{ke as component};
