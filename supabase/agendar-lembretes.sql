-- Agenda o envio dos lembretes: o Supabase chama o site de hora em hora (minuto 0).
-- Rode UMA vez no SQL Editor, depois de trocar SEU_CRON_SECRET pelo mesmo valor
-- cadastrado na Vercel como CRON_SECRET.
-- (Se mudar o endereço do site, rode de novo com o endereço novo: o agendamento é substituído.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('revisando-lembretes')
where exists (select 1 from cron.job where jobname = 'revisando-lembretes');

select cron.schedule(
  'revisando-lembretes',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://revisando-khaki.vercel.app/api/cron/lembretes',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET'),
    timeout_milliseconds := 55000
  );
  $$
);

-- Para conferir: select jobname, schedule, active from cron.job;
-- Últimas execuções: select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
