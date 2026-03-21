update public.vouchers set
  description = 'Get 25 kr off your next order',
  points_cost = 200,
  discount_type = 'fixed_discount',
  discount_value = 25,
  is_active = true
where name = '25 KR DISCOUNT';

insert into public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
select '25 KR DISCOUNT', 'Get 25 kr off your next order', 200, 'fixed_discount', 25, true
where not exists (select 1 from public.vouchers where name = '25 KR DISCOUNT');

update public.vouchers set
  description = 'Get 50 kr off your next order',
  points_cost = 400,
  discount_type = 'fixed_discount',
  discount_value = 50,
  is_active = true
where name = '50 KR DISCOUNT';

insert into public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
select '50 KR DISCOUNT', 'Get 50 kr off your next order', 400, 'fixed_discount', 50, true
where not exists (select 1 from public.vouchers where name = '50 KR DISCOUNT');

update public.vouchers set
  description = 'Get 100 kr off your next order',
  points_cost = 800,
  discount_type = 'fixed_discount',
  discount_value = 100,
  is_active = true
where name = '100 KR DISCOUNT';

insert into public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
select '100 KR DISCOUNT', 'Get 100 kr off your next order', 800, 'fixed_discount', 100, true
where not exists (select 1 from public.vouchers where name = '100 KR DISCOUNT');

update public.vouchers set
  description = 'Get 150 kr off your next order',
  points_cost = 1200,
  discount_type = 'fixed_discount',
  discount_value = 150,
  is_active = true
where name = '150 KR DISCOUNT';

insert into public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
select '150 KR DISCOUNT', 'Get 150 kr off your next order', 1200, 'fixed_discount', 150, true
where not exists (select 1 from public.vouchers where name = '150 KR DISCOUNT');

update public.vouchers set
  description = 'Get 250 kr off your next order',
  points_cost = 2000,
  discount_type = 'fixed_discount',
  discount_value = 250,
  is_active = true
where name = '250 KR DISCOUNT';

insert into public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
select '250 KR DISCOUNT', 'Get 250 kr off your next order', 2000, 'fixed_discount', 250, true
where not exists (select 1 from public.vouchers where name = '250 KR DISCOUNT');

update public.vouchers set
  description = 'A 500 kr gift card - use it yourself or send it to someone!',
  points_cost = 5000,
  discount_type = 'gift_card',
  discount_value = 500,
  is_active = true
where name = '500 KR GIFT CARD';

insert into public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
select '500 KR GIFT CARD', 'A 500 kr gift card - use it yourself or send it to someone!', 5000, 'gift_card', 500, true
where not exists (select 1 from public.vouchers where name = '500 KR GIFT CARD');

update public.vouchers set
  description = 'Get free delivery on one order',
  points_cost = 800,
  discount_type = 'free_shipping',
  discount_value = 0,
  is_active = true
where name = 'FREE DELIVERY DISCOUNT';

insert into public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
select 'FREE DELIVERY DISCOUNT', 'Get free delivery on one order', 800, 'free_shipping', 0, true
where not exists (select 1 from public.vouchers where name = 'FREE DELIVERY DISCOUNT');
