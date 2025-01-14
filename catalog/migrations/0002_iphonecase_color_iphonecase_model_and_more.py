# Generated by Django 5.1.3 on 2024-11-30 16:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='iphonecase',
            name='color',
            field=models.CharField(max_length=256, null=True, unique=True, verbose_name='Color'),
        ),
        migrations.AddField(
            model_name='iphonecase',
            name='model',
            field=models.CharField(max_length=256, null=True, unique=True, verbose_name='Model'),
        ),
        migrations.AlterField(
            model_name='iphonecase',
            name='name',
            field=models.CharField(max_length=256, null=True, unique=True, verbose_name='Name'),
        ),
    ]
