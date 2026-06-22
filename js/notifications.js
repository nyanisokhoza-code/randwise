function initPushToggle(){
  const enabled = isPushEnabled();
  updatePushToggle(enabled);
}

function sendLocalNotification(title, body, icon){
  if(!isPushEnabled()) return;
  try{
    new Notification(title, {
      body,
      icon: icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231a7a4a"/><text y=".9em" font-size="80">🌱</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231a7a4a"/></svg>',
      tag: 'myrandwise',
    });
  }catch(e){ console.warn('Notification failed:', e); }
}

function schedulePushNudges(){
  if(!isPushEnabled()) return;
  if(!getSetting('daily_reminder') && !getSetting('share_nudge')) return;
  const now = new Date();
  const hour = now.getHours();
  const totalExp = expenses.reduce((s,e) => s + Number(e.amount||0), 0);
  const weekBudget = getSmartWeeklyBudget().wb;
  const pctUsed = weekBudget > 0 ? Math.round(totalExp/weekBudget*100) : 0;
  const name = user?.name?.split(' ')[0] || 'there';

  // Today's expenses
  const todayExp = expenses.filter(e => {
    const d = new Date(e.logged_at || e.created_at);
    return d.toDateString() === now.toDateString();
  });
  const todayTotal = todayExp.reduce((s,e)=>s+Number(e.amount||0),0);

  // Schedule 8pm daily reminder if user hasn't logged today
  // Works when app is open. For background delivery, Service Worker handles it.
  const msUntil8pm = (() => {
    const target = new Date(now);
    target.setHours(20, 0, 0, 0);
    if(target <= now) return 0; // already past 8pm
    return target.getTime() - now.getTime();
  })();

  if(todayExp.length === 0){
    const delay = msUntil8pm > 0 ? msUntil8pm : 0;
    if(msUntil8pm > 0){
      // Schedule for exactly 8pm
      setTimeout(()=>{
        if(!isPushEnabled()) return;
        const stillNoExp = expenses.filter(e=>new Date(e.logged_at||e.created_at).toDateString()===new Date().toDateString()).length===0;
        if(stillNoExp){
          sendLocalNotification(
            `Hey ${name}, did you spend anything today? 💸`,
            'Tap to log your expenses — it takes 20 seconds to stay on track.',
          );
        }
      }, delay);
    } else if(hour >= 20) {
      // It's already past 8pm and nothing logged
      sendLocalNotification(
        `Hey ${name}, did you spend anything today? 💸`,
        'Tap to log your expenses — it takes 20 seconds to stay on track.',
      );
    }
  }

  // Store notification schedule in localStorage for SW to check
  const notifSchedule = {
    dailyReminder: { hour: 20, enabled: todayExp.length === 0 },
    userName: name,
    weekBudget,
    pctUsed,
    payDay: user?.pay_day || 25,
    lastScheduled: now.toISOString()
  };
  localStorage.setItem('rw_notif_schedule', JSON.stringify(notifSchedule));

  // Weekly budget warning (fires immediately if already over)
  if(pctUsed >= 80 && pctUsed < 100){
    setTimeout(()=>{
      sendLocalNotification(
        `Budget alert — ${pctUsed}% used this week`,
        `You have R${Math.max(0,weekBudget-totalExp).toLocaleString('en-ZA')} left. Slow down on spending.`,
      );
    }, 10000);
  }

  // Share nudge — frequency controlled by admin
  const shareFreqMap={'weekly':7,'biweekly':14,'monthly':30};
  const shareFreqDays=shareFreqMap[getSetting('share_nudge_frequency')]||7;
  const lastShareNudge = localStorage.getItem('rw_share_nudge_week');
  const thisWeek = `${now.getFullYear()}-W${Math.ceil(now.getDate()/7)}`;
  if(now.getDay() === 6 && lastShareNudge !== thisWeek){ // Saturday
    localStorage.setItem('rw_share_nudge_week', thisWeek);
    setTimeout(()=>{
      sendLocalNotification(
        'Know someone struggling with money? 🌱',
        'Share MyRandWise — it could change their financial life.',
      );
    }, 15000);
  }

  // Payday
  const payDay = user?.pay_day || 25;
  if(now.getDate() === payDay){
    setTimeout(()=>{
      sendLocalNotification(
        `🎉 Payday, ${name}! Plan your month now`,
        'Your salary should be hitting. Open MyRandWise to allocate your budget.',
      );
    }, 3000);
  }
}

