# Generated by Django 5.1.5 on 2025-07-24 21:48

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_contact'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='contact',
            name='icon',
        ),
    ]
