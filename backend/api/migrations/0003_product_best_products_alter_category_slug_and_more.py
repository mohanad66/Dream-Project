# Generated by Django 5.1.5 on 2025-07-18 17:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_alter_product_name_alter_product_slug'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='best_products',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='category',
            name='slug',
            field=models.SlugField(editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='image',
            field=models.ImageField(upload_to='products/'),
        ),
    ]
