// Wait for workspace measurement after hydration before using local view controls.
async function navigation(page) {
 const nav=page.getByRole('navigation',{name:'Review workspace',exact:true,includeHidden:true});
 await nav.waitFor({state:'attached'});
 await page.waitForFunction(()=>Boolean(document.querySelector('nav[aria-label="Review workspace"]')?.nextElementSibling?.style.getPropertyValue('--review-height')));
 return nav;
}
export async function showReview(page) {
 const nav=await navigation(page);
 if(await nav.isVisible())await nav.getByRole('button',{name:'Review',exact:true}).click();
 await page.getByRole('tab',{name:'Feedback',exact:true}).click();
}
export async function showWork(page) {
 const nav=await navigation(page);
 if(await nav.isVisible())await nav.getByRole('button',{name:'Submitted work',exact:true}).click();
}
