from django.contrib.auth import login, authenticate
from django.shortcuts import render, redirect
from authentication.forms import SignUpForm

# Create your views here.


def signup(request):
    """SignUp view, render a template that displays a form to register a user

        Author : Adrian Crespo Musheghyan
    """
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)
            return redirect('home')
    else:
        form = SignUpForm()
    return render(request, 'signup.html', {'form': form})
