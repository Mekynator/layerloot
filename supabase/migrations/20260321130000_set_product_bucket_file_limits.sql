-- Set explicit upload size limits for product asset buckets.
-- Values are bytes.

update storage.buckets
set file_size_limit = 20971520 -- 20 MB
where id = 'product-images';

update storage.buckets
set file_size_limit = 104857600 -- 100 MB
where id = '3d-models';
