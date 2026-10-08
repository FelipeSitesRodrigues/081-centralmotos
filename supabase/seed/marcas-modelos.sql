-- ============================================================================
-- Central Motos · marcas e modelos de partida
--
-- Os modelos que mais giram numa loja de motos do interior (Honda e Yamaha na
-- frente), mais as marcas que aparecem como seminova. Categoria e cilindrada
-- são o padrão do modelo: o painel deixa ajustar por moto e cadastrar modelo
-- que faltar ("não achei, cadastrar"). Rodar de novo não duplica nada.
-- ============================================================================

insert into public.marcas (nome, slug)
values
  ('Honda', 'honda'),
  ('Yamaha', 'yamaha'),
  ('Suzuki', 'suzuki'),
  ('Haojue', 'haojue'),
  ('Shineray', 'shineray'),
  ('Dafra', 'dafra'),
  ('Kawasaki', 'kawasaki'),
  ('BMW', 'bmw'),
  ('Royal Enfield', 'royal-enfield'),
  ('Triumph', 'triumph'),
  ('Bajaj', 'bajaj'),
  ('Voltz', 'voltz')
on conflict (slug) do nothing;

insert into public.modelos (marca_id, nome, slug, categoria, cilindrada)
select m.id, x.nome, x.slug, x.categoria, x.cilindrada
  from (values
    -- Honda
    ('honda', 'Pop 100', 'pop-100', 'street', 97),
    ('honda', 'Pop 110i', 'pop-110i', 'street', 109),
    ('honda', 'Biz 100', 'biz-100', 'motoneta', 97),
    ('honda', 'Biz 110i', 'biz-110i', 'motoneta', 109),
    ('honda', 'Biz 125', 'biz-125', 'motoneta', 124),
    ('honda', 'CG 125 Fan', 'cg-125-fan', 'street', 124),
    ('honda', 'CG 150 Fan', 'cg-150-fan', 'street', 149),
    ('honda', 'CG 150 Titan', 'cg-150-titan', 'street', 149),
    ('honda', 'CG 160 Start', 'cg-160-start', 'street', 162),
    ('honda', 'CG 160 Fan', 'cg-160-fan', 'street', 162),
    ('honda', 'CG 160 Titan', 'cg-160-titan', 'street', 162),
    ('honda', 'CG 160 Cargo', 'cg-160-cargo', 'street', 162),
    ('honda', 'NXR 150 Bros', 'nxr-150-bros', 'trail', 149),
    ('honda', 'Bros 160', 'bros-160', 'trail', 162),
    ('honda', 'XRE 190', 'xre-190', 'trail', 184),
    ('honda', 'XRE 300', 'xre-300', 'trail', 291),
    ('honda', 'Sahara 300', 'sahara-300', 'trail', 293),
    ('honda', 'CRF 250F', 'crf-250f', 'trail', 249),
    ('honda', 'CB 250F Twister', 'cb-250f-twister', 'naked', 249),
    ('honda', 'CB 300F Twister', 'cb-300f-twister', 'naked', 293),
    ('honda', 'CB 300R', 'cb-300r', 'naked', 291),
    ('honda', 'CB 500F', 'cb-500f', 'naked', 471),
    ('honda', 'CB 650R', 'cb-650r', 'naked', 649),
    ('honda', 'CB 500X', 'cb-500x', 'big-trail', 471),
    ('honda', 'NX 500', 'nx-500', 'big-trail', 471),
    ('honda', 'NC 750X', 'nc-750x', 'big-trail', 745),
    ('honda', 'Africa Twin', 'africa-twin', 'big-trail', 1084),
    ('honda', 'Elite 125', 'elite-125', 'scooter', 124),
    ('honda', 'PCX 150', 'pcx-150', 'scooter', 149),
    ('honda', 'PCX 160', 'pcx-160', 'scooter', 156),
    ('honda', 'ADV 150', 'adv-150', 'scooter', 149),
    ('honda', 'ADV 160', 'adv-160', 'scooter', 156),
    -- Yamaha
    ('yamaha', 'YBR 125', 'ybr-125', 'street', 124),
    ('yamaha', 'Factor 125', 'factor-125', 'street', 124),
    ('yamaha', 'Factor 150', 'factor-150', 'street', 149),
    ('yamaha', 'Fazer 150', 'fazer-150', 'street', 149),
    ('yamaha', 'Fazer FZ15', 'fazer-fz15', 'street', 149),
    ('yamaha', 'Fazer 250', 'fazer-250', 'naked', 249),
    ('yamaha', 'Fazer FZ25', 'fazer-fz25', 'naked', 249),
    ('yamaha', 'MT-03', 'mt-03', 'naked', 321),
    ('yamaha', 'MT-07', 'mt-07', 'naked', 689),
    ('yamaha', 'R3', 'r3', 'esportiva', 321),
    ('yamaha', 'XTZ 125', 'xtz-125', 'trail', 124),
    ('yamaha', 'Crosser 150', 'crosser-150', 'trail', 149),
    ('yamaha', 'Lander 250', 'lander-250', 'trail', 249),
    ('yamaha', 'Ténéré 250', 'tenere-250', 'trail', 249),
    ('yamaha', 'Neo 125', 'neo-125', 'scooter', 125),
    ('yamaha', 'Fluo 125', 'fluo-125', 'scooter', 125),
    ('yamaha', 'NMax 160', 'nmax-160', 'scooter', 155),
    ('yamaha', 'XMax 250', 'xmax-250', 'scooter', 249),
    -- Suzuki
    ('suzuki', 'Yes 125', 'yes-125', 'street', 124),
    ('suzuki', 'Intruder 125', 'intruder-125', 'custom', 124),
    ('suzuki', 'Burgman 125', 'burgman-125', 'scooter', 124),
    ('suzuki', 'V-Strom 650', 'v-strom-650', 'big-trail', 645),
    -- Haojue
    ('haojue', 'DK 150', 'dk-150', 'street', 149),
    ('haojue', 'NK 150', 'nk-150', 'naked', 149),
    ('haojue', 'DR 160', 'dr-160', 'trail', 162),
    ('haojue', 'Chopper Road 150', 'chopper-road-150', 'custom', 149),
    ('haojue', 'Master Ride 150', 'master-ride-150', 'custom', 149),
    ('haojue', 'Lindy 125', 'lindy-125', 'scooter', 124),
    -- Shineray
    ('shineray', 'Phoenix 50', 'phoenix-50', 'motoneta', 49),
    ('shineray', 'Jet 50', 'jet-50', 'scooter', 49),
    ('shineray', 'Worker 125', 'worker-125', 'street', 124),
    -- Dafra
    ('dafra', 'Apache RTR 200', 'apache-rtr-200', 'naked', 197),
    ('dafra', 'Next 250', 'next-250', 'naked', 248),
    ('dafra', 'Citycom 300i', 'citycom-300i', 'scooter', 278),
    -- Kawasaki
    ('kawasaki', 'Ninja 300', 'ninja-300', 'esportiva', 296),
    ('kawasaki', 'Ninja 400', 'ninja-400', 'esportiva', 399),
    ('kawasaki', 'Z400', 'z400', 'naked', 399),
    ('kawasaki', 'Z900', 'z900', 'naked', 948),
    ('kawasaki', 'Versys-X 300', 'versys-x-300', 'big-trail', 296),
    -- BMW
    ('bmw', 'G 310 R', 'g-310-r', 'naked', 313),
    ('bmw', 'G 310 GS', 'g-310-gs', 'big-trail', 313),
    ('bmw', 'F 850 GS', 'f-850-gs', 'big-trail', 853),
    ('bmw', 'R 1250 GS', 'r-1250-gs', 'big-trail', 1254),
    -- Royal Enfield
    ('royal-enfield', 'Hunter 350', 'hunter-350', 'street', 349),
    ('royal-enfield', 'Meteor 350', 'meteor-350', 'custom', 349),
    ('royal-enfield', 'Classic 350', 'classic-350', 'custom', 349),
    ('royal-enfield', 'Himalayan', 'himalayan', 'big-trail', 411),
    -- Triumph
    ('triumph', 'Trident 660', 'trident-660', 'naked', 660),
    ('triumph', 'Street Triple', 'street-triple', 'naked', 765),
    ('triumph', 'Tiger 900', 'tiger-900', 'big-trail', 888),
    -- Bajaj
    ('bajaj', 'Dominar 400', 'dominar-400', 'naked', 373),
    -- Voltz (elétricas, sem cilindrada)
    ('voltz', 'EVS', 'evs', 'eletrica', null),
    ('voltz', 'EV1', 'ev1', 'eletrica', null)
  ) as x(marca, nome, slug, categoria, cilindrada)
  join public.marcas m on m.slug = x.marca
on conflict (marca_id, slug) do nothing;

select
  (select count(*) from public.marcas) as marcas,
  (select count(*) from public.modelos) as modelos;
