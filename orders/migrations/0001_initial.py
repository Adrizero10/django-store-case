# Generated by Django 5.1.3 on 2024-11-30 17:19

import django.core.validators
import django.db.models.deletion
import orders.models
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('catalog', '0002_iphonecase_color_iphonecase_model_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(help_text='Required', max_length=64, verbose_name='First Name')),
                ('last_name', models.CharField(help_text='Required', max_length=64, verbose_name='Last Name')),
                ('email', models.EmailField(help_text='Required', max_length=64)),
                ('address', models.CharField(help_text='Required', max_length=128, verbose_name='Address')),
                ('postal_code', models.CharField(help_text='Required. We only ship to Spain so... the postal code must be 5 digits', max_length=5, validators=[django.core.validators.MinLengthValidator(5), django.core.validators.MaxLengthValidator(5), orders.models.validate_digit], verbose_name='Postal Code')),
                ('city', models.CharField(help_text='Required', max_length=256, verbose_name='City')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='Order created')),
                ('updated', models.DateTimeField(auto_now=True, verbose_name='Order updated')),
                ('paid', models.BooleanField(default=False, verbose_name='Status paid order')),
            ],
            options={
                'verbose_name': 'Order',
                'verbose_name_plural': 'Orders',
                'ordering': ['first_name', 'last_name', 'email', 'updated', 'paid'],
            },
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price', models.DecimalField(decimal_places=2, help_text='Price cant be negative', max_digits=7, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Price')),
                ('quantity', models.PositiveSmallIntegerField(default=0, help_text='Number items', verbose_name='Quantity')),
                ('case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='catalog.iphonecase', verbose_name='IphoneCase')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='orders.order', verbose_name='Order id')),
            ],
            options={
                'verbose_name': 'OrderItem',
                'verbose_name_plural': 'OrderItems',
                'ordering': ['order', 'case', 'price', 'quantity'],
            },
        ),
    ]
