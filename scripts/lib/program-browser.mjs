import {showReview} from './review-workspace.mjs';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openAssignmentEditor } from './week-editor.mjs';

export async function verifyProgramBrowser({appUrl, fixture, jarFor, admin, ok, browserCohorts, action}) {
  const {chromium}=await import('playwright-core');
  const browser=await chromium.launch({executablePath:process.env.GAP_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const screenshots=await mkdtemp(join(tmpdir(),'gap-program-browser-'));
  let activePage;
  async function context(person,width) {
    const ctx=await browser.newContext({viewport:{width,height:850}});
    const jar=await jarFor(person);
    await ctx.addCookies([...jar].map(([name,value])=>({name,value,url:appUrl})));
    return ctx;
  }
  try {
    for(const [index,width] of [1280,390].entries()) {
      const year=2098+index;
      assert.equal(ok(await admin.from('program_cohorts').select('id').eq('quarter','spring').eq('year',year)).length,0,'Reserved browser cohort already exists; do not overwrite');
      const learner=await fixture(),lead=await fixture('admin');
      const ctx=await context(lead,width),page=await ctx.newPage();
      activePage=page;
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${appUrl}/admin/members`);
      await page.getByRole('button',{name:'Manage cohort',exact:true}).click();
      await page.getByText('Create another cohort',{exact:true}).click();
      await page.getByLabel(/^Quarter/).selectOption('spring');
      await page.getByLabel('Year',{exact:true}).fill(String(year));
      await page.getByLabel('Starts',{exact:true}).fill(`${year}-04-01`);
      await page.getByLabel('Ends',{exact:true}).fill(`${year}-06-01`);
      await page.getByRole('button',{name:'Create cohort',exact:true}).click();
      // Discover the exact UI-created fixture ID before any later assertion can fail.
      let cohort;
      for(let i=0;i<100;i++) {
        cohort=ok(await admin.from('program_cohorts').select('id').eq('quarter','spring').eq('year',year).maybeSingle())?.id;
        if(cohort) break;
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      assert.ok(cohort,'Cohort creation failed'); browserCohorts.push(cohort);
      // Wait for the action's router.push before issuing a document navigation.
      await page.waitForURL(url=>url.pathname==='/admin/members' && url.searchParams.get('cohort')===cohort);
      await page.goto(`${appUrl}/admin/members?cohort=${cohort}`);
      await page.getByRole('button',{name:'Manage cohort',exact:true}).click();
      await page.getByRole('button',{name:'Activate',exact:true}).click();
      await page.getByText('Cohort activated.',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Add participant',exact:true}).click();
      await page.locator('select').filter({has:page.locator('option[value="'+learner.personId+'"]')}).selectOption(learner.personId);
      await page.getByRole('button',{name:'Add to cohort',exact:true}).click();
      await page.getByText('Participant added.',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Portal access',exact:true}).click();
      await page.getByLabel('Search members').fill(learner.email);
      await page.getByRole('button',{name:'Edit access',exact:true}).click();
      await page.getByLabel('Full name',{exact:true}).fill(`Browser Analyst ${width}`);
      await page.getByRole('button',{name:'Save access',exact:true}).click();
      await page.getByText('Portal access saved.',{exact:true}).waitFor();
      await page.reload(); await page.getByRole('button',{name:'Cohort participants',exact:true}).click();
      await page.getByText(`Browser Analyst ${width}`,{exact:true}).waitFor();
      const week=ok(await admin.from('program_weeks').select('id').eq('cohort_id',cohort).eq('week_number',1).single()).id;
      await page.goto(`${appUrl}/admin/weeks/${week}?cohort=${cohort}`);
      await page.getByLabel('Title',{exact:true}).fill(`Browser week ${width}`);
      await page.getByLabel(/^Description/).fill('Private draft instructions');
      await page.getByRole('navigation',{name:'Week sections',exact:true}).getByRole('button',{name:/^Assignments/}).click();
      await page.getByRole('button',{name:'Add assignment',exact:true}).click();
      const assignment = await page.getByRole('combobox',{name:'Select assignment',exact:true,includeHidden:true}).inputValue();
      await page.getByRole('textbox',{name:'Title',exact:true}).fill('Browser assignment');
      await page.getByLabel('Deadline (Pacific time)',{exact:true}).fill('2099-05-01T12:00');
      await openAssignmentEditor(page,assignment,'Instructions');
      await page.getByRole('textbox',{name:'Instructions',exact:true}).fill('Provide evidence.');
      // Discard warning must allow staying on the populated editor.
      page.once('dialog',dialog=>dialog.dismiss());
      await page.getByRole('link',{name:'← All weeks',exact:true}).click();
      assert.match(page.url(),new RegExp(week));
      await page.getByRole('button',{name:'Save draft',exact:true}).click();
      await page.getByText('Draft saved.',{exact:true}).waitFor();
      const memberContext=await context(learner,width),memberPage=await memberContext.newPage();
      memberPage.on('pageerror',error=>errors.push(error.message));
      await memberPage.goto(`${appUrl}/`);
      assert.ok(!(await memberPage.content()).includes('Private draft instructions'));
      // Fail a real save request; preserve draft fields for a retry.
      await page.getByRole('navigation',{name:'Week sections',exact:true}).getByRole('button',{name:'Overview',exact:true}).click();
      await page.getByLabel(/^Description/).fill('Published browser instructions');
      await page.route('**/admin/weeks/*',route=>route.request().headers()['next-action'] ? route.abort('failed') : route.continue());
      await page.getByRole('button',{name:'Save & publish',exact:true}).click();
      await page.getByText('Could not save. Please try again; your changes have been kept.',{exact:true}).waitFor();
      assert.equal(await page.getByLabel(/^Description/).inputValue(),'Published browser instructions');
      await page.unroute('**/admin/weeks/*');
      await page.getByRole('button',{name:'Save & publish',exact:true}).click();
      await page.getByText('Week published.',{exact:true}).waitFor();
      await page.reload(); assert.equal(await page.getByLabel(/^Description/).inputValue(),'Published browser instructions');
      await memberPage.goto(`${appUrl}/week/1`);
      await memberPage.getByText('Published browser instructions',{exact:true}).waitFor();
      await memberPage.getByRole('link',{name:/^View assignment:/}).click();
      await memberPage.getByRole('button',{name:'Submit assignment',exact:true}).click();
      await memberPage.getByRole('button',{name:/^Submit link/}).click();
      await memberPage.getByLabel('Submission link',{exact:true}).fill('https://example.com/browser-evidence');
      await memberPage.getByRole('button',{name:'Submit assignment',exact:true}).click();
      await memberPage.getByRole('link',{name:'View submission',exact:true}).waitFor();
      await memberPage.reload(); await memberPage.getByRole('link',{name:'View submission',exact:true}).click();
      const enrollment=ok(await admin.from('cohort_enrollments').select('id').eq('cohort_id',cohort).eq('person_id',learner.personId).single()).id;
      const submission=ok(await admin.from('submissions').select('id').eq('enrollment_id',enrollment).eq('is_current',true).single()).id;
      await page.goto(`${appUrl}/admin/submissions/${submission}?cohort=${cohort}`);
      await showReview(page);await page.getByLabel('Request revision',{exact:true}).check();
      await page.getByLabel(/Feedback \(/).fill('Add a second source.');
      await page.getByRole('button',{name:'Save review',exact:true}).click();
      await page.getByText('Review saved.',{exact:true}).waitFor();
      await memberPage.reload(); await memberPage.getByText('Add a second source.',{exact:true}).waitFor();
      for(const [target,label] of [[page,'admin'],[memberPage,'member']]) {
        assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await target.screenshot({path:join(screenshots,`${label}-${width}.png`),fullPage:true});
      }
      // Actual sign-out, then browser history and direct navigation cannot reopen protected UI.
      for(const [target,targetContext] of [[memberPage,memberContext],[page,ctx]]) {
        await target.locator('header button[aria-haspopup="menu"]').click();
        await target.getByRole('menuitem',{name:'Sign out',exact:true}).click();
        await target.waitForURL('**/login');
        await target.goBack(); await target.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
        await target.goForward(); await target.reload();
        for(const path of ['/','/admin','/week/1','/week/1/submission']) {
          await target.goto(`${appUrl}${path}`); await target.waitForURL('**/login');
        }
        const jar=new Map((await targetContext.cookies()).map(c=>[c.name,c.value]));
        assert.match((await action('saveLink',[week,'https://example.com/after-signout'],jar)).redirect,/\/login/);
      }
      assert.deepEqual(errors,[]);
      await ctx.close(); await memberContext.close();
    }
    console.log(`Program browser screenshots: ${screenshots}`);
  } catch(error) {
    if(activePage && !activePage.isClosed()) await activePage.screenshot({path:join(screenshots,'failure.png'),fullPage:true});
    console.log(`Program browser failure screenshot: ${screenshots}`);
    throw error;
  } finally { await browser.close(); }
}
