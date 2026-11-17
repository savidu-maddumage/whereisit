-- Optional demo data for the admin panel. Contact details use reserved example
-- values and are not real ways to reach a reporter.
insert into public.items (
  id, name, category, location, date_label, status, description,
  owner_name, email, phone
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'Black leather wallet', 'Wallet', 'Colombo, Sri Lanka', 'Today', 'Lost',
    'Black bifold wallet with cards inside. Please contact me if found.',
    'Nimal', 'wallet-owner@example.com', '+1-202-555-0101'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'Set of house keys', 'Other', 'Negombo, Sri Lanka', 'Today', 'Found',
    'Found near the bus station. Key ring has a blue tag.',
    'Amaya', 'keys-owner@example.com', '+1-202-555-0102'
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'Wireless headphones', 'Electronics', 'Gampaha, Sri Lanka', 'Yesterday', 'Lost',
    'Over-ear headphones in a dark case.',
    'Kasun', 'headphones-owner@example.com', '+1-202-555-0103'
  )
on conflict (id) do nothing;
